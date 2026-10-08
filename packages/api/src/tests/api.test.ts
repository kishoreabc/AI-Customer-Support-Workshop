import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../app.js';
import { getDatabase } from '../database/connection.js';
import { initializeSchema } from '../database/schema.js';
import { seedDatabase } from '../database/seed.js';
import { processCustomerMessage, detectFrustration, detectHumanRequest } from '../services/ai-agent.js';
import { executeTool } from '../services/tool-executor.js';

describe('AI Customer Support Platform Suite', () => {
  let app: any;
  let aliceToken: string;
  let bobToken: string;
  let adminToken: string;
  let agentToken: string;

  beforeAll(async () => {
    const db = getDatabase();
    initializeSchema(db);
    await seedDatabase();
    app = createApp();

    // Login Alice (Customer 1)
    const resAlice = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', password: 'password123' }),
    }).catch(() => null);

    // If server not running on port 3000 during test, we test handlers or direct imports
  });

  describe('Security & Isolation Requirements', () => {
    it('1. Rejects search_customer tool in customer chat context', async () => {
      const result = await executeTool(
        'search_customer',
        { query: 'Bob' },
        {
          conversationId: 'test-conv',
          customerId: 'cust-1',
          userRole: 'CUSTOMER',
          userId: 'usr-cust-1',
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('strictly prohibited');
    });

    it('2. Denies access when Customer 1 queries Customer 2 order details', async () => {
      // ord-1003 belongs to cust-2 (Bob)
      const result = await executeTool(
        'get_order_details',
        { orderId: 'ord-1003' },
        {
          conversationId: 'test-conv',
          customerId: 'cust-1', // Alice
          userRole: 'CUSTOMER',
          userId: 'usr-cust-1',
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access Denied');
    });

    it('3. Successfully returns own order details for Customer 1', async () => {
      // ord-1001 belongs to cust-1 (Alice)
      const result = await executeTool(
        'get_order_details',
        { orderId: 'ord-1001' },
        {
          conversationId: 'test-conv',
          customerId: 'cust-1', // Alice
          userRole: 'CUSTOMER',
          userId: 'usr-cust-1',
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.order_id).toBe('ord-1001');
      expect(result.data.items.length).toBeGreaterThan(0);
    });

    it('4. Detects frustration keywords correctly', () => {
      expect(detectFrustration('I am extremely angry and this is unacceptable')).toBe(true);
      expect(detectFrustration('Where is my tracking number?')).toBe(false);
    });

    it('5. Detects human representative requests accurately', () => {
      expect(detectHumanRequest('I want to talk to a human agent please')).toBe(true);
      expect(detectHumanRequest('Can I speak with a representative?')).toBe(true);
      expect(detectHumanRequest('What is the battery life of the laptop?')).toBe(false);
    });

    it('6. Automatically escalates and stops AI auto-reply when human takeover occurs', async () => {
      // Start a conversation for Alice
      const db = getDatabase();
      const convId = `conv-test-takeover-${Date.now()}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO conversations (conversation_id, customer_id, status, created_at, updated_at)
        VALUES (?, 'cust-1', 'AI_ACTIVE', ?, ?)
      `).run(convId, now, now);

      // Customer asks for human
      const response = await processCustomerMessage({
        conversationId: convId,
        customerId: 'cust-1',
        message: 'I demand to talk to a real person immediately!',
        userRole: 'CUSTOMER',
        userId: 'usr-cust-1',
      });

      expect(response.escalated).toBe(true);
      expect(response.toolCallsExecuted).toContain('escalate_to_human');

      // Verify conversation status is now HUMAN_HANDOFF
      const updatedConv = db.prepare('SELECT status FROM conversations WHERE conversation_id = ?').get(convId) as any;
      expect(updatedConv.status).toBe('HUMAN_HANDOFF');

      // Next message should NOT trigger AI automatic response
      const followup = await processCustomerMessage({
        conversationId: convId,
        customerId: 'cust-1',
        message: 'Are you there? Still waiting.',
        userRole: 'CUSTOMER',
        userId: 'usr-cust-1',
      });

      expect(followup.content).toContain('received by your assigned human support agent');
    });
  });
});
