import { v4 as uuidv4 } from 'uuid';
import { getDatabase, queryGet, queryAll, execute, runTransaction } from '../database/connection.js';
import { searchVectorStore } from './vector-store.js';
import { logger } from '../utils/logger.js';

export interface ToolExecutionContext {
  conversationId: string;
  customerId: string;
  userRole: 'ADMIN' | 'SUPPORT_AGENT' | 'CUSTOMER';
  userId: string;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  escalated?: boolean;
}

export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const db = getDatabase();
  const execId = `exec-${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();

  logger.info(`Executing tool "${toolName}" for customer ${context.customerId}`, { args });

  let result: ToolResult;

  try {
    switch (toolName) {
      // 1. get_customer_profile
      case 'get_customer_profile': {
        const profile = queryGet(`
          SELECT customer_id, first_name, last_name, email, phone, phone_number,
                 alternate_number, address, city, state, country, pincode,
                 customer_status, customer_since
          FROM customer_profiles
          WHERE customer_id = ?
        `, context.customerId) as any;

        if (!profile) {
          result = { success: false, error: 'Subscriber profile not found' };
        } else {
          result = { success: true, data: profile };
        }
        break;
      }

      // 2. get_active_plan
      case 'get_active_plan': {
        const sub = queryGet(`
          SELECT s.subscription_id, s.mobile_number, s.activation_date, s.expiry_date,
                 s.status as subscription_status, s.auto_renew,
                 p.plan_id, p.name as plan_name, p.price, p.validity_days,
                 p.data_allowance, p.voice_allowance, p.sms_allowance, p.is_5g
          FROM subscriptions s
          JOIN telecom_plans p ON s.plan_id = p.plan_id
          WHERE s.customer_id = ? AND s.status = 'ACTIVE'
          ORDER BY s.activation_date DESC
          LIMIT 1
        `, context.customerId) as any;

        if (!sub) {
          result = {
            success: true,
            data: { message: 'No active plan currently registered. Subscriber may need to recharge.' },
          };
        } else {
          const expiry = new Date(sub.expiry_date);
          const daysRemaining = Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          result = {
            success: true,
            data: {
              ...sub,
              daysRemaining,
              expiryFormatted: expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            },
          };
        }
        break;
      }

      // 3. get_available_plans
      case 'get_available_plans': {
        let sql = "SELECT * FROM telecom_plans WHERE status = 'ACTIVE'";
        const params: any[] = [];

        if (args.category) {
          sql += ' AND category = ?';
          params.push(args.category);
        }
        if (args.is5GOnly) {
          sql += ' AND is_5g = 1';
        }
        if (args.maxPrice) {
          sql += ' AND price <= ?';
          params.push(args.maxPrice);
        }

        sql += ' ORDER BY price ASC LIMIT 10';
        const plans = queryAll(sql, ...params);
        result = { success: true, data: plans };
        break;
      }

      // 4. get_data_usage
      case 'get_data_usage': {
        const usage = queryGet(`
          SELECT usage_id, mobile_number, data_used_gb, data_remaining_gb, period_start, period_end
          FROM telecom_usage
          WHERE customer_id = ?
          ORDER BY updated_at DESC
          LIMIT 1
        `, context.customerId) as any;

        if (!usage) {
          result = { success: false, error: 'Usage information unavailable for this subscriber.' };
        } else {
          const isExhausted = usage.data_remaining_gb <= 0.15;
          result = {
            success: true,
            data: {
              ...usage,
              isQuotaExhausted: isExhausted,
              warning: isExhausted
                ? 'High-speed daily quota is exhausted. Internet speed throttled to 64 Kbps until midnight reset or Data Booster activation.'
                : null,
            },
          };
        }
        break;
      }

      // 5. get_voice_usage
      case 'get_voice_usage': {
        const usage = queryGet(`
          SELECT mobile_number, voice_used_mins, voice_remaining_mins, period_start, period_end
          FROM telecom_usage
          WHERE customer_id = ?
          ORDER BY updated_at DESC
          LIMIT 1
        `, context.customerId) as any;

        result = {
          success: true,
          data: usage || { voice_used_mins: 0, voice_remaining_mins: -1, note: 'Unlimited calling active' },
        };
        break;
      }

      // 6. get_sms_usage
      case 'get_sms_usage': {
        const usage = queryGet(`
          SELECT mobile_number, sms_used, sms_remaining, period_start, period_end
          FROM telecom_usage
          WHERE customer_id = ?
          ORDER BY updated_at DESC
          LIMIT 1
        `, context.customerId) as any;

        result = { success: true, data: usage || { sms_used: 0, sms_remaining: 100 } };
        break;
      }

      // 7. get_recharge_history
      case 'get_recharge_history': {
        const limit = args.limit || 5;
        const recharges = queryAll(`
          SELECT r.recharge_id, r.mobile_number, r.amount, r.payment_method,
                 r.transaction_id, r.status, r.created_at, p.name as plan_name
          FROM recharges r
          LEFT JOIN telecom_plans p ON r.plan_id = p.plan_id
          WHERE r.customer_id = ?
          ORDER BY r.created_at DESC
          LIMIT ?
        `, context.customerId, limit);

        result = { success: true, data: recharges };
        break;
      }

      // 8. get_recharge_status
      case 'get_recharge_status': {
        const txnId = args.transactionId;
        const recharge = queryGet(`
          SELECT r.*, p.name as plan_name
          FROM recharges r
          LEFT JOIN telecom_plans p ON r.plan_id = p.plan_id
          WHERE (r.transaction_id = ? OR r.recharge_id = ?)
        `, txnId, txnId) as any;

        if (!recharge) {
          result = { success: false, error: `No recharge record found with ID "${txnId}"` };
        } else if (recharge.customer_id !== context.customerId && context.userRole === 'CUSTOMER') {
          // Strict customer isolation enforcement!
          result = {
            success: false,
            error: 'Security isolation: You cannot inspect recharge records belonging to another customer.',
          };
        } else {
          result = { success: true, data: recharge };
        }
        break;
      }

      // 9. get_bill
      case 'get_bill': {
        const bill = queryGet(`
          SELECT bill_id, mobile_number, billing_period, amount, due_date, status, breakdown_json, created_at
          FROM bills
          WHERE customer_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `, context.customerId) as any;

        if (!bill) {
          result = { success: true, data: { message: 'No unpaid bills. Your account has a zero balance.' } };
        } else {
          result = {
            success: true,
            data: {
              ...bill,
              breakdown: JSON.parse(bill.breakdown_json || '{}'),
            },
          };
        }
        break;
      }

      // 10. get_billing_history
      case 'get_billing_history': {
        const bills = queryAll(`
          SELECT bill_id, mobile_number, billing_period, amount, due_date, status, created_at
          FROM bills
          WHERE customer_id = ?
          ORDER BY created_at DESC
          LIMIT 10
        `, context.customerId);

        result = { success: true, data: bills };
        break;
      }

      // 11. get_sim_details
      case 'get_sim_details': {
        const sim = queryGet(`
          SELECT sim_id, mobile_number, sim_type, iccid, status, activated_at
          FROM sim_cards
          WHERE customer_id = ?
          LIMIT 1
        `, context.customerId) as any;

        if (!sim) {
          result = { success: false, error: 'SIM card information not found for this account.' };
        } else {
          result = { success: true, data: sim };
        }
        break;
      }

      // 12. check_sim_status
      case 'check_sim_status': {
        const sim = queryGet(`
          SELECT sim_type, status, iccid, mobile_number
          FROM sim_cards
          WHERE customer_id = ?
          LIMIT 1
        `, context.customerId) as any;

        if (!sim) {
          result = { success: false, error: 'No SIM profile found.' };
        } else {
          result = {
            success: true,
            data: {
              status: sim.status,
              simType: sim.sim_type,
              mobileNumber: sim.mobile_number,
              isActive: sim.status === 'ACTIVE',
            },
          };
        }
        break;
      }

      // 13. check_network_status
      case 'check_network_status': {
        const city = args.city || (queryGet('SELECT city FROM customer_profiles WHERE customer_id = ?', context.customerId) as any)?.city || 'Mumbai';
        const outage = queryGet(`
          SELECT * FROM network_outages
          WHERE city LIKE ? AND status != 'RESOLVED'
          LIMIT 1
        `, `%${city}%`) as any;

        if (outage) {
          result = {
            success: true,
            data: {
              status: 'DEGRADED',
              hasOutage: true,
              city,
              outageDetails: outage,
            },
          };
        } else {
          result = {
            success: true,
            data: {
              status: 'OPERATIONAL',
              hasOutage: false,
              city,
              networkHealth: 'Normal (99.9% uptime)',
              signalStrength: 'Excellent',
              coverage5G: 'Available (True 5G SA active)',
            },
          };
        }
        break;
      }

      // 14. check_network_outage
      case 'check_network_outage': {
        const cityQuery = args.city?.trim() || '';
        const outages = queryAll(`
          SELECT outage_id, region, city, affected_service, network_type, severity, status, start_time, estimated_resolution, description
          FROM network_outages
          WHERE city LIKE ? AND status != 'RESOLVED'
        `, `%${cityQuery}%`);

        if (outages.length === 0) {
          result = {
            success: true,
            data: {
              outageFound: false,
              city: cityQuery,
              message: `No active network outages reported in ${cityQuery}. All cell towers and fiber backbones operating normally.`,
            },
          };
        } else {
          result = {
            success: true,
            data: {
              outageFound: true,
              city: cityQuery,
              activeOutages: outages,
            },
          };
        }
        break;
      }

      // 15. check_5g_coverage
      case 'check_5g_coverage': {
        const location = args.location || '';
        result = {
          success: true,
          data: {
            location,
            coverage5GAvailable: true,
            technology: 'Standalone (SA) True 5G',
            frequencyBands: ['n28 (700MHz)', 'n78 (3500MHz)', 'n258 (26GHz mmWave)'],
            estimatedSpeedRange: '350 Mbps - 980 Mbps',
          },
        };
        break;
      }

      // 16. get_roaming_plans
      case 'get_roaming_plans': {
        const plans = queryAll(`
          SELECT plan_id, name, description, price, validity_days, data_allowance, voice_allowance
          FROM telecom_plans
          WHERE category = 'INTERNATIONAL_ROAMING' OR roaming_available = 1
        `);
        result = { success: true, data: plans };
        break;
      }

      // 17. create_recharge
      case 'create_recharge': {
        const { planId, paymentMethod = 'UPI' } = args;
        const plan = queryGet('SELECT * FROM telecom_plans WHERE plan_id = ?', planId) as any;

        if (!plan) {
          result = { success: false, error: `Plan ID "${planId}" not found.` };
          break;
        }

        const customer = queryGet('SELECT phone_number FROM customer_profiles WHERE customer_id = ?', context.customerId) as any;
        const mobileNumber = customer?.phone_number || '+91 98765 43210';
        const rechargeId = `rch-${uuidv4().substring(0, 6)}`;
        const txnId = `TXN-UPI-${Math.floor(10000000 + Math.random() * 90000000)}`;

        const expiryDate = new Date(Date.now() + plan.validity_days * 24 * 60 * 60 * 1000).toISOString();

        runTransaction(db, () => {
          // Record recharge
          execute(`
            INSERT INTO recharges (recharge_id, customer_id, mobile_number, plan_id, amount, payment_method, transaction_id, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'SUCCESS', ?)
          `, rechargeId, context.customerId, mobileNumber, planId, plan.price, paymentMethod, txnId, now);

          // Update/upsert subscription
          const existingSub = queryGet("SELECT subscription_id FROM subscriptions WHERE customer_id = ? AND status = 'ACTIVE'", context.customerId) as any;
          if (existingSub) {
            execute(`
              UPDATE subscriptions SET plan_id = ?, expiry_date = ?, updated_at = ?
              WHERE subscription_id = ?
            `, planId, expiryDate, now, existingSub.subscription_id);
          } else {
            execute(`
              INSERT INTO subscriptions (subscription_id, customer_id, plan_id, mobile_number, activation_date, expiry_date, status, auto_renew, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 1, ?, ?)
            `, `sub-${uuidv4().substring(0, 6)}`, context.customerId, planId, mobileNumber, now, expiryDate, now, now);
          }

          // Reset usage quota
          execute(`
            UPDATE telecom_usage SET data_used_gb = 0.0, data_remaining_gb = 10.0, updated_at = ?
            WHERE customer_id = ?
          `, now, context.customerId);

          // Audit log
          execute(`
            INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
            VALUES (?, ?, 'AI', 'CREATE_RECHARGE', 'Recharge', ?, ?, ?)
          `, `log-${uuidv4()}`, context.userId, rechargeId, JSON.stringify({ planId, amount: plan.price, txnId }), now);
        });

        result = {
          success: true,
          data: {
            message: `Recharge of ₹${plan.price} for plan "${plan.name}" successful!`,
            rechargeId,
            transactionId: txnId,
            planName: plan.name,
            validityDays: plan.validity_days,
            newExpiryDate: expiryDate,
          },
        };
        break;
      }

      // 18. create_support_ticket
      case 'create_support_ticket': {
        const { subject, description, category = 'NETWORK', priority = 'MEDIUM' } = args;
        const ticketId = `TCK-${Math.floor(100 + Math.random() * 900)}`;

        execute(`
          INSERT INTO support_tickets (
            ticket_id, customer_id, conversation_id, subject, description,
            category, priority, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
        `, ticketId, context.customerId, context.conversationId, subject, description, category, priority, now, now);

        execute(`
          INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
          VALUES (?, ?, 'AI', 'CREATE_TICKET', 'SupportTicket', ?, ?, ?)
        `, `log-${uuidv4()}`, context.userId, ticketId, JSON.stringify({ category, priority, subject }), now);

        result = {
          success: true,
          data: {
            ticketId,
            subject,
            category,
            priority,
            status: 'OPEN',
            message: `Telecom support ticket ${ticketId} registered with priority ${priority}. Our technical desk will inspect your issue.`,
          },
        };
        break;
      }

      // 19. escalate_to_human
      case 'escalate_to_human': {
        const { reason } = args;

        execute(`
          UPDATE conversations
          SET status = 'HUMAN_HANDOFF', escalation_reason = ?, updated_at = ?
          WHERE conversation_id = ?
        `, reason, now, context.conversationId);

        execute(`
          INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
          VALUES (?, ?, 'AI', 'ESCALATE_TO_HUMAN', 'Conversation', ?, ?, ?)
        `, `log-${uuidv4()}`, context.userId, context.conversationId, JSON.stringify({ reason }), now);

        result = {
          success: true,
          escalated: true,
          data: {
            message: 'Session has been transferred to a senior human telecom representative. Please stand by while an agent connects.',
            reason,
          },
        };
        break;
      }

      // 20. search_knowledge_base
      case 'search_knowledge_base': {
        const query = args.query;
        const matches = await searchVectorStore(query, 3);
        result = {
          success: true,
          data: matches.map((m) => ({
            title: m.title,
            category: m.category,
            content: m.chunkText,
            relevanceScore: Number(m.similarity.toFixed(3)),
          })),
        };
        break;
      }

      // 21. search_faqs
      case 'search_faqs': {
        const query = args.query || '';
        const pattern = `%${query}%`;
        const faqs = queryAll(`
          SELECT faq_id, question, answer, category
          FROM faqs
          WHERE (question LIKE ? OR answer LIKE ? OR tags LIKE ?) AND status = 'PUBLISHED'
          LIMIT 3
        `, pattern, pattern, pattern);

        result = { success: true, data: faqs };
        break;
      }

      // Backward Compatibility Handlers (Orders & Customer Search for Tests & Admin)
      case 'search_customer': {
        if (context.userRole === 'CUSTOMER') {
          result = {
            success: false,
            error: 'Authorization error: Customers are strictly prohibited from searching other customer profiles.',
          };
          break;
        }
        const pattern = `%${args.query || ''}%`;
        const matches = queryAll(`
          SELECT customer_id, first_name, last_name, email, phone_number, city
          FROM customer_profiles
          WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
          LIMIT 5
        `, pattern, pattern, pattern);
        result = { success: true, data: matches };
        break;
      }

      case 'get_order_details': {
        const orderId = args.orderId;
        const order = queryGet('SELECT * FROM orders WHERE order_id = ?', orderId) as any;
        if (!order) {
          result = { success: false, error: 'Order not found' };
        } else if (order.customer_id !== context.customerId && context.userRole === 'CUSTOMER') {
          result = {
            success: false,
            error: 'Customer isolation error: You are not authorized to view orders belonging to another customer.',
          };
        } else {
          result = { success: true, data: order };
        }
        break;
      }

      case 'get_order_status': {
        const orderId = args.orderId;
        const order = queryGet('SELECT order_id, customer_id, order_status, estimated_delivery_date, tracking_number FROM orders WHERE order_id = ?', orderId) as any;
        if (!order) {
          result = { success: false, error: 'Order not found' };
        } else if (order.customer_id !== context.customerId && context.userRole === 'CUSTOMER') {
          result = { success: false, error: 'Customer isolation error: Access denied.' };
        } else {
          result = { success: true, data: order };
        }
        break;
      }

      default:
        result = { success: false, error: `Unknown tool "${toolName}"` };
    }
  } catch (err: any) {
    logger.error(`Error executing tool "${toolName}":`, err);
    result = { success: false, error: err.message || 'Tool execution failed' };
  }

  // Record tool execution audit
  try {
    execute(`
      INSERT INTO tool_executions (execution_id, conversation_id, tool_name, input, output, status, error, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, execId, context.conversationId, toolName, JSON.stringify(args), JSON.stringify(result.data || null), result.success ? 'SUCCESS' : 'ERROR', result.error || null, now);
  } catch (auditErr) {
    logger.error('Failed to record tool execution audit: ' + String(auditErr));
  }

  return result;
}
