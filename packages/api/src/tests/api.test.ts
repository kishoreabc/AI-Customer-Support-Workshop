import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabase } from '../database/connection.js';
import { initializeSchema } from '../database/schema.js';
import { seedDatabase } from '../database/seed.js';
import { processCustomerMessage, detectFrustration, detectHumanRequest } from '../services/ai-agent.js';
import { executeTool } from '../services/tool-executor.js';

describe('AI Telecom Customer Support Platform Suite', () => {
  beforeAll(async () => {
    const db = getDatabase();
    initializeSchema(db);
    await seedDatabase(false);
  });

  describe('Telecom AI Tools & Security Requirements', () => {
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

    it('2. Denies access when Customer 1 queries Customer 2 recharge status', async () => {
      // rch-2003 belongs to cust-2 (Bob)
      const result = await executeTool(
        'get_recharge_status',
        { transactionId: 'rch-2003' },
        {
          conversationId: 'test-conv',
          customerId: 'cust-1', // Alice
          userRole: 'CUSTOMER',
          userId: 'usr-cust-1',
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Security isolation');
    });

    it('3. Successfully returns active plan for Customer 1', async () => {
      const result = await executeTool(
        'get_active_plan',
        {},
        {
          conversationId: 'test-conv',
          customerId: 'cust-1',
          userRole: 'CUSTOMER',
          userId: 'usr-cust-1',
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.plan_name).toBe('Unlimited 5G 799');
      expect(result.data.is_5g).toBe(1);
    });

    it('4. Successfully returns live data usage for Customer 1', async () => {
      const result = await executeTool(
        'get_data_usage',
        {},
        {
          conversationId: 'test-conv',
          customerId: 'cust-1',
          userRole: 'CUSTOMER',
          userId: 'usr-cust-1',
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.data_remaining_gb).toBe(7.4);
      expect(result.data.isQuotaExhausted).toBe(false);
    });

    it('5. Detects regional network outage in Chennai', async () => {
      const result = await executeTool(
        'check_network_outage',
        { city: 'Chennai' },
        {
          conversationId: 'test-conv',
          customerId: 'cust-2', // Bob in Chennai
          userRole: 'CUSTOMER',
          userId: 'usr-cust-2',
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.outageFound).toBe(true);
      expect(result.data.activeOutages[0].city).toBe('Chennai');
      expect(result.data.activeOutages[0].severity).toBe('MAJOR');
    });

    it('6. Checks 5G coverage successfully', async () => {
      const result = await executeTool(
        'check_5g_coverage',
        { location: 'Mumbai' },
        {
          conversationId: 'test-conv',
          customerId: 'cust-1',
          userRole: 'CUSTOMER',
          userId: 'usr-cust-1',
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.coverage5GAvailable).toBe(true);
      expect(result.data.technology).toContain('True 5G');
    });

    it('7. Returns international roaming packs', async () => {
      const result = await executeTool(
        'get_roaming_plans',
        {},
        {
          conversationId: 'test-conv',
          customerId: 'cust-1',
          userRole: 'CUSTOMER',
          userId: 'usr-cust-1',
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.some((p: any) => p.name.includes('Roaming'))).toBe(true);
    });

    it('8. Detects frustration and human keywords correctly', () => {
      expect(detectFrustration('Your network service is terrible, worst company ever!')).toBe(true);
      expect(detectHumanRequest('I want to speak with a human agent please')).toBe(true);
      expect(detectFrustration('What is my remaining data balance?')).toBe(false);
    });

    it('9. Automatically escalates and stops AI auto-reply when human takeover occurs', async () => {
      const db = getDatabase();
      const convId = `conv-telecom-${Date.now()}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO conversations (conversation_id, customer_id, status, created_at, updated_at)
        VALUES (?, 'cust-1', 'AI_ACTIVE', ?, ?)
      `).run(convId, now, now);

      // Customer asks for human
      const response = await processCustomerMessage({
        conversationId: convId,
        customerId: 'cust-1',
        message: 'I demand to talk to a real person right now!',
        userRole: 'CUSTOMER',
        userId: 'usr-cust-1',
      });

      expect(response.escalated).toBe(true);
      expect(response.toolCallsExecuted).toContain('escalate_to_human');

      // Verify conversation status is now HUMAN_HANDOFF
      const updatedConv = db.prepare('SELECT status FROM conversations WHERE conversation_id = ?').get(convId) as any;
      expect(updatedConv.status).toBe('HUMAN_HANDOFF');

      // Subsequent message should NOT trigger AI automatic response
      const followup = await processCustomerMessage({
        conversationId: convId,
        customerId: 'cust-1',
        message: 'Are you there? Still waiting.',
        userRole: 'CUSTOMER',
        userId: 'usr-cust-1',
      });

      expect(followup.escalated).toBe(true);
      expect(followup.toolCallsExecuted.length).toBe(0);
      expect(followup.content).toContain('human support representative has taken over');
    });
    it('10. Retrieves subscriber SIM card details', async () => {
      const result = await executeTool(
        'get_sim_details',
        {},
        {
          conversationId: 'test-conv',
          customerId: 'cust-1',
          userRole: 'CUSTOMER',
          userId: 'usr-cust-1',
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.iccid).toBeDefined();
      expect(result.data.status).toBe('ACTIVE');
    });

    it('11. Checks subscriber SIM status and active status', async () => {
      const result = await executeTool(
        'check_sim_status',
        {},
        {
          conversationId: 'test-conv',
          customerId: 'cust-1',
          userRole: 'CUSTOMER',
          userId: 'usr-cust-1',
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.isActive).toBe(true);
      expect(result.data.status).toBe('ACTIVE');
    });

    it('12. Checks network health status for a city', async () => {
      const result = await executeTool(
        'check_network_status',
        { city: 'Mumbai' },
        {
          conversationId: 'test-conv',
          customerId: 'cust-1',
          userRole: 'CUSTOMER',
          userId: 'usr-cust-1',
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('OPERATIONAL');
      expect(result.data.city).toBe('Mumbai');
    });

    it('13. Filters available telecom plans by 5G support', async () => {
      const result = await executeTool(
        'get_available_plans',
        { is5GOnly: true },
        {
          conversationId: 'test-conv',
          customerId: 'cust-1',
          userRole: 'CUSTOMER',
          userId: 'usr-cust-1',
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((p: any) => p.is_5g === 1)).toBe(true);
    });

    it('14. Retrieves customer latest bill with itemized breakdown', async () => {
      const result = await executeTool(
        'get_bill',
        {},
        {
          conversationId: 'test-conv',
          customerId: 'cust-1',
          userRole: 'CUSTOMER',
          userId: 'usr-cust-1',
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.bill_id).toBeDefined();
      expect(result.data.breakdown).toBeDefined();
    });

  });
});

