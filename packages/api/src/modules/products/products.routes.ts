import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { queryGet, queryAll, execute } from '../../database/connection.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateJwt } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

export const productsRouter = Router();

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  price: z.number().positive(),
  currency: z.string().default('USD'),
  stockQuantity: z.number().int().nonnegative().default(0),
  availabilityStatus: z.enum(['IN_STOCK', 'OUT_OF_STOCK', 'BACKORDER', 'DISCONTINUED']).default('IN_STOCK'),
  specifications: z.record(z.any()).optional(),
  warrantyInformation: z.string().min(1),
  returnPolicy: z.string().min(1),
});

const updateProductSchema = productSchema.partial();

// GET /api/v1/products
productsRouter.get('/', authenticateJwt, (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string || '20', 10)));
  const offset = (page - 1) * pageSize;

  let baseQuery = 'FROM products WHERE 1=1';
  const params: any[] = [];

  if (search) {
    baseQuery += ' AND (name LIKE ? OR sku LIKE ? OR description LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern);
  }

  if (category) {
    baseQuery += ' AND category = ?';
    params.push(category);
  }

  if (status) {
    baseQuery += ' AND availability_status = ?';
    params.push(status);
  }

  const countRow = queryGet(`SELECT COUNT(*) as total ${baseQuery}`, ...params) as { total: number };
  const total = countRow ? countRow.total : 0;

  const items = queryAll(`
    SELECT * ${baseQuery}
    ORDER BY name ASC
    LIMIT ? OFFSET ?
  `, ...params, pageSize, offset);

  const parsed = items.map((p) => ({
    ...p,
    specifications: p.specifications ? JSON.parse(p.specifications) : {},
  }));

  sendSuccess(res, {
    items: parsed,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

// GET /api/v1/products/:id
productsRouter.get('/:id', authenticateJwt, (req: Request, res: Response) => {
  const productId = req.params.id as string;
  const product = queryGet('SELECT * FROM products WHERE product_id = ?', productId) as any;

  if (!product) {
    sendError(res, 'Product not found', 404);
    return;
  }

  sendSuccess(res, {
    ...product,
    specifications: product.specifications ? JSON.parse(product.specifications) : {},
  });
});

// POST /api/v1/products
productsRouter.post('/', authenticateJwt, requireRole('ADMIN'), validateBody(productSchema), (req: Request, res: Response) => {
  const body = req.body;
  const productId = `prod-${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();

  const existing = queryGet('SELECT id FROM products WHERE sku = ?', body.sku);
  if (existing) {
    sendError(res, 'Product SKU already exists', 409);
    return;
  }

  execute(`
    INSERT INTO products (
      product_id, name, sku, description, category, price, currency,
      stock_quantity, availability_status, specifications,
      warranty_information, return_policy, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, productId, body.name, body.sku, body.description, body.category, body.price, body.currency || 'USD', body.stockQuantity, body.availabilityStatus, body.specifications ? JSON.stringify(body.specifications) : null, body.warrantyInformation, body.returnPolicy, now, now);

  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, ?, 'CREATE_PRODUCT', 'Product', ?, ?, ?)
  `, `log-${uuidv4()}`, req.user!.userId, req.user!.role, productId, JSON.stringify({ name: body.name, sku: body.sku }), now);

  const created = queryGet('SELECT * FROM products WHERE product_id = ?', productId) as any;
  sendSuccess(res, {
    ...created,
    specifications: created.specifications ? JSON.parse(created.specifications) : {},
  }, 201);
});

// PUT /api/v1/products/:id
productsRouter.put('/:id', authenticateJwt, requireRole('ADMIN'), validateBody(updateProductSchema), (req: Request, res: Response) => {
  const productId = req.params.id as string;
  const current = queryGet('SELECT * FROM products WHERE product_id = ?', productId) as any;

  if (!current) {
    sendError(res, 'Product not found', 404);
    return;
  }

  const body = req.body;
  const now = new Date().toISOString();

  execute(`
    UPDATE products SET
      name = ?,
      sku = ?,
      description = ?,
      category = ?,
      price = ?,
      currency = ?,
      stock_quantity = ?,
      availability_status = ?,
      specifications = ?,
      warranty_information = ?,
      return_policy = ?,
      updated_at = ?
    WHERE product_id = ?
  `, body.name ?? current.name, body.sku ?? current.sku, body.description ?? current.description, body.category ?? current.category, body.price ?? current.price, body.currency ?? current.currency, body.stockQuantity ?? current.stock_quantity, body.availabilityStatus ?? current.availability_status, body.specifications !== undefined ? JSON.stringify(body.specifications) : current.specifications, body.warrantyInformation ?? current.warranty_information, body.returnPolicy ?? current.return_policy, now, productId);

  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, ?, 'UPDATE_PRODUCT', 'Product', ?, ?, ?)
  `, `log-${uuidv4()}`, req.user!.userId, req.user!.role, productId, JSON.stringify(body), now);

  const updated = queryGet('SELECT * FROM products WHERE product_id = ?', productId) as any;
  sendSuccess(res, {
    ...updated,
    specifications: updated.specifications ? JSON.parse(updated.specifications) : {},
  });
});

// DELETE /api/v1/products/:id
productsRouter.delete('/:id', authenticateJwt, requireRole('ADMIN'), (req: Request, res: Response) => {
  const productId = req.params.id as string;
  const now = new Date().toISOString();

  const product = queryGet('SELECT * FROM products WHERE product_id = ?', productId) as any;
  if (!product) {
    sendError(res, 'Product not found', 404);
    return;
  }

  execute('UPDATE products SET availability_status = ?, updated_at = ? WHERE product_id = ?', 'DISCONTINUED', now, productId);

  execute(`
    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
    VALUES (?, ?, ?, 'DISCONTINUE_PRODUCT', 'Product', ?, ?, ?)
  `, `log-${uuidv4()}`, req.user!.userId, req.user!.role, productId, JSON.stringify({ name: product.name }), now);

  sendSuccess(res, { message: 'Product set to discontinued' });
});
