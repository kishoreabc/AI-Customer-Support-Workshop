import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase, queryGet, execute, runTransaction } from '../../database/connection.js';
import { config } from '../../config.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { validateBody } from '../../middleware/validate.js';
import { authenticateJwt, AuthUser } from '../../middleware/auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Customer registration
authRouter.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  const db = getDatabase();
  const { email, password, firstName, lastName, phone, address, city, state, country, postalCode } = req.body;

  const existing = queryGet('SELECT id FROM users WHERE email = ?', email);
  if (existing) {
    sendError(res, 'An account with this email already exists', 409);
    return;
  }

  const userId = `usr-${uuidv4()}`;
  const customerId = `cust-${uuidv4()}`;
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  runTransaction(db, () => {
    execute(`
      INSERT INTO users (user_id, email, password_hash, role, created_at)
      VALUES (?, ?, ?, 'CUSTOMER', ?)
    `, userId, email, passwordHash, now);

    execute(`
      INSERT INTO customer_profiles (
        customer_id, user_id, first_name, last_name, email, phone,
        address, city, state, country, postal_code, customer_status,
        account_created_at, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `, customerId, userId, firstName, lastName, email, phone || null, address || null, city || null, state || null, country || null, postalCode || null, now, JSON.stringify(['New Customer']));

    execute(`
      INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
      VALUES (?, ?, 'CUSTOMER', 'CUSTOMER_REGISTER', 'User', ?, ?, ?)
    `, `log-${uuidv4()}`, userId, userId, JSON.stringify({ email }), now);
  });

  const tokenPayload: AuthUser = {
    userId,
    email,
    role: 'CUSTOMER',
    customerId,
  };

  const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '7d' });

  sendSuccess(res, {
    token,
    user: {
      userId,
      email,
      role: 'CUSTOMER',
      customerId,
      firstName,
      lastName,
    },
  }, 201);
});

// Customer Login
authRouter.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = queryGet(`
    SELECT u.user_id, u.email, u.password_hash, u.role, c.customer_id, c.first_name, c.last_name, c.customer_status
    FROM users u
    LEFT JOIN customer_profiles c ON u.user_id = c.user_id
    WHERE u.email = ? AND u.role = 'CUSTOMER'
  `, email) as any;

  if (!user) {
    sendError(res, 'Invalid email or password', 401);
    return;
  }

  if (user.customer_status === 'SUSPENDED') {
    sendError(res, 'Your account has been suspended. Please contact support.', 403);
    return;
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    sendError(res, 'Invalid email or password', 401);
    return;
  }

  const now = new Date().toISOString();
  execute('UPDATE customer_profiles SET last_login_at = ? WHERE customer_id = ?', now, user.customer_id);

  const tokenPayload: AuthUser = {
    userId: user.user_id,
    email: user.email,
    role: 'CUSTOMER',
    customerId: user.customer_id,
  };

  const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '7d' });

  sendSuccess(res, {
    token,
    user: {
      userId: user.user_id,
      email: user.email,
      role: 'CUSTOMER',
      customerId: user.customer_id,
      firstName: user.first_name,
      lastName: user.last_name,
    },
  });
});

// Admin / Support Agent Login
authRouter.post('/admin/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = queryGet(`
    SELECT u.user_id, u.email, u.password_hash, u.role,
           a.admin_id, a.name as admin_name, a.department as admin_dept, a.status as admin_status,
           s.agent_id, s.name as agent_name, s.department as agent_dept, s.status as agent_status
    FROM users u
    LEFT JOIN admin_users a ON u.user_id = a.user_id
    LEFT JOIN support_agents s ON u.user_id = s.user_id
    WHERE u.email = ? AND u.role IN ('ADMIN', 'SUPPORT_AGENT')
  `, email) as any;

  if (!user) {
    sendError(res, 'Invalid administrator credentials', 401);
    return;
  }

  const status = user.role === 'ADMIN' ? user.admin_status : user.agent_status;
  if (status === 'SUSPENDED' || status === 'INACTIVE') {
    sendError(res, 'Account access is inactive or suspended', 403);
    return;
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    sendError(res, 'Invalid administrator credentials', 401);
    return;
  }

  const now = new Date().toISOString();
  if (user.role === 'SUPPORT_AGENT' && user.agent_id) {
    execute('UPDATE support_agents SET last_active_at = ? WHERE agent_id = ?', now, user.agent_id);
  }

  const tokenPayload: AuthUser = {
    userId: user.user_id,
    email: user.email,
    role: user.role,
    adminId: user.admin_id || undefined,
    agentId: user.agent_id || undefined,
  };

  const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '7d' });

  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, ?, 'LOGIN', 'AdminSession', ?, ?, ?)
  `, `log-${uuidv4()}`, user.user_id, user.role, user.user_id, JSON.stringify({ email: user.email }), now);

  sendSuccess(res, {
    token,
    user: {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      name: user.role === 'ADMIN' ? user.admin_name : user.agent_name,
      department: user.role === 'ADMIN' ? user.admin_dept : user.agent_dept,
      adminId: user.admin_id,
      agentId: user.agent_id,
    },
  });
});

// Current user profile
authRouter.get('/me', authenticateJwt, (req: Request, res: Response) => {
  const user = req.user!;

  if (user.role === 'CUSTOMER') {
    const profile = queryGet(`
      SELECT customer_id, first_name, last_name, email, phone, address, city, state, country, postal_code, customer_status, tags, notes
      FROM customer_profiles
      WHERE customer_id = ?
    `, user.customerId);

    sendSuccess(res, {
      ...user,
      profile,
    });
    return;
  }

  if (user.role === 'ADMIN') {
    const admin = queryGet('SELECT admin_id, name, department, status FROM admin_users WHERE user_id = ?', user.userId);
    sendSuccess(res, {
      ...user,
      profile: admin,
    });
    return;
  }

  if (user.role === 'SUPPORT_AGENT') {
    const agent = queryGet('SELECT agent_id, name, email, department, status FROM support_agents WHERE user_id = ?', user.userId);
    sendSuccess(res, {
      ...user,
      profile: agent,
    });
    return;
  }

  sendSuccess(res, user);
});

// Logout endpoint
authRouter.post('/logout', authenticateJwt, (_req: Request, res: Response) => {
  sendSuccess(res, { message: 'Logged out successfully' });
});
