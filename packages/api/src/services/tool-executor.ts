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
          SELECT customer_id, first_name, last_name, email, phone, address, city, state, country, postal_code, customer_status
          FROM customer_profiles
          WHERE customer_id = ?
        `, context.customerId) as any;

        if (!profile) {
          result = { success: false, error: 'Customer profile not found' };
        } else {
          result = { success: true, data: profile };
        }
        break;
      }

      // 2. search_customer
      case 'search_customer': {
        if (context.userRole === 'CUSTOMER') {
          result = {
            success: false,
            error: 'Authorization error: Customers are strictly prohibited from searching other customer profiles.',
          };
          break;
        }

        const query = `%${args.query || ''}%`;
        const matches = queryAll(`
          SELECT customer_id, first_name, last_name, email, customer_status
          FROM customer_profiles
          WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
          LIMIT 5
        `, query, query, query);

        result = { success: true, data: matches };
        break;
      }

      // 3. get_customer_orders
      case 'get_customer_orders': {
        const limit = Math.min(10, Math.max(1, args.limit || 5));
        const orders = queryAll(`
          SELECT order_id, order_date, total_amount, currency, payment_status, order_status, shipping_address, tracking_number, estimated_delivery_date
          FROM orders
          WHERE customer_id = ?
          ORDER BY order_date DESC
          LIMIT ?
        `, context.customerId, limit);

        result = { success: true, data: orders };
        break;
      }

      // 4. get_order_details
      case 'get_order_details': {
        const orderId = args.orderId;
        const order = queryGet('SELECT * FROM orders WHERE order_id = ?', orderId) as any;

        if (!order) {
          result = { success: false, error: `Order ${orderId} does not exist.` };
          break;
        }

        if (context.userRole === 'CUSTOMER' && order.customer_id !== context.customerId) {
          result = {
            success: false,
            error: `Access Denied: Order ${orderId} does not belong to the authenticated customer account.`,
          };
          break;
        }

        const items = queryAll('SELECT * FROM order_items WHERE order_id = ?', orderId);
        result = {
          success: true,
          data: {
            ...order,
            items,
          },
        };
        break;
      }

      // 5. get_order_status
      case 'get_order_status': {
        const orderId = args.orderId;
        const order = queryGet('SELECT * FROM orders WHERE order_id = ?', orderId) as any;

        if (!order) {
          result = { success: false, error: `Order ${orderId} does not exist.` };
          break;
        }

        if (context.userRole === 'CUSTOMER' && order.customer_id !== context.customerId) {
          result = {
            success: false,
            error: `Access Denied: Order ${orderId} does not belong to the authenticated customer.`,
          };
          break;
        }

        result = {
          success: true,
          data: {
            orderId: order.order_id,
            status: order.order_status,
            paymentStatus: order.payment_status,
            trackingNumber: order.tracking_number,
            estimatedDeliveryDate: order.estimated_delivery_date,
            shippingAddress: order.shipping_address,
          },
        };
        break;
      }

      // 6. search_products
      case 'search_products': {
        const query = `%${args.query || ''}%`;
        const category = args.category;

        let sql = `
          SELECT product_id, name, sku, category, price, currency, availability_status, stock_quantity, warranty_information, return_policy
          FROM products
          WHERE (name LIKE ? OR sku LIKE ? OR description LIKE ?)
        `;
        const params: any[] = [query, query, query];

        if (category) {
          sql += ' AND category = ?';
          params.push(category);
        }

        sql += ' LIMIT 6';
        const products = queryAll(sql, ...params);
        result = { success: true, data: products };
        break;
      }

      // 7. get_product_details
      case 'get_product_details': {
        const productId = args.productId;
        const product = queryGet('SELECT * FROM products WHERE product_id = ?', productId) as any;

        if (!product) {
          result = { success: false, error: `Product ${productId} not found.` };
          break;
        }

        result = {
          success: true,
          data: {
            ...product,
            specifications: product.specifications ? JSON.parse(product.specifications) : {},
          },
        };
        break;
      }

      // 8. get_refund_status
      case 'get_refund_status': {
        const orderId = args.orderId;
        const order = queryGet('SELECT * FROM orders WHERE order_id = ?', orderId) as any;

        if (!order) {
          result = { success: false, error: `Order ${orderId} not found.` };
          break;
        }

        if (context.userRole === 'CUSTOMER' && order.customer_id !== context.customerId) {
          result = { success: false, error: `Access Denied: Order ${orderId} does not belong to this customer.` };
          break;
        }

        const orderDate = new Date(order.order_date).getTime();
        const daysSinceOrder = Math.floor((Date.now() - orderDate) / (1000 * 60 * 60 * 24));
        const within30Days = daysSinceOrder <= 30;

        let eligibility = 'NOT_ELIGIBLE';
        if (order.payment_status === 'REFUNDED') {
          eligibility = 'ALREADY_REFUNDED';
        } else if (order.order_status === 'CANCELLED') {
          eligibility = 'CANCELLED_PENDING_REFUND';
        } else if (within30Days && (order.order_status === 'DELIVERED' || order.order_status === 'CONFIRMED')) {
          eligibility = 'ELIGIBLE_FOR_RETURN';
        }

        result = {
          success: true,
          data: {
            orderId: order.order_id,
            paymentStatus: order.payment_status,
            orderStatus: order.order_status,
            daysSinceOrder,
            returnWindowDays: 30,
            eligibility,
            policyNotice: 'Items must be returned in original packaging within 30 days of delivery. Refunds are credited within 3-5 business days after inspection.',
          },
        };
        break;
      }

      // 9. create_support_ticket
      case 'create_support_ticket': {
        const ticketId = `tik-${uuidv4().substring(0, 8)}`;
        const subject = args.subject;
        const description = args.description;
        const category = args.category || 'GENERAL';
        const priority = args.priority || 'MEDIUM';

        execute(`
          INSERT INTO support_tickets (
            ticket_id, customer_id, conversation_id, subject, description,
            category, priority, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
        `, ticketId, context.customerId, context.conversationId, subject, description, category, priority, now, now);

        result = {
          success: true,
          data: {
            ticketId,
            status: 'OPEN',
            subject,
            priority,
            message: `Support ticket #${ticketId} has been successfully created. Our support team will follow up promptly.`,
          },
        };
        break;
      }

      // 10. get_support_ticket
      case 'get_support_ticket': {
        const ticketId = args.ticketId;
        const ticket = queryGet('SELECT * FROM support_tickets WHERE ticket_id = ?', ticketId) as any;

        if (!ticket) {
          result = { success: false, error: `Ticket ${ticketId} not found.` };
          break;
        }

        if (context.userRole === 'CUSTOMER' && ticket.customer_id !== context.customerId) {
          result = { success: false, error: 'Forbidden: You cannot access this support ticket.' };
          break;
        }

        result = {
          success: true,
          data: {
            ticketId: ticket.ticket_id,
            subject: ticket.subject,
            status: ticket.status,
            priority: ticket.priority,
            category: ticket.category,
            createdAt: ticket.created_at,
            resolvedAt: ticket.resolved_at,
          },
        };
        break;
      }

      // 11. update_support_ticket
      case 'update_support_ticket': {
        const ticketId = args.ticketId;
        const ticket = queryGet('SELECT * FROM support_tickets WHERE ticket_id = ?', ticketId) as any;

        if (!ticket) {
          result = { success: false, error: `Ticket ${ticketId} not found.` };
          break;
        }

        if (context.userRole === 'CUSTOMER' && ticket.customer_id !== context.customerId) {
          result = { success: false, error: 'Forbidden: You cannot update this ticket.' };
          break;
        }

        const newDescription = `${ticket.description}\n\n[Customer Update ${new Date().toLocaleDateString()}]: ${args.notes}`;
        execute('UPDATE support_tickets SET description = ?, updated_at = ? WHERE ticket_id = ?', newDescription, now, ticketId);

        result = { success: true, data: { ticketId, status: ticket.status, message: 'Ticket updated successfully.' } };
        break;
      }

      // 12. escalate_to_human
      case 'escalate_to_human': {
        const reason = args.reason || 'Customer requested human support agent';
        const ticketId = `tik-${uuidv4().substring(0, 8)}`;

        const availableAgent = queryGet("SELECT agent_id FROM support_agents WHERE status = 'ACTIVE' LIMIT 1") as any;
        const assignedAgentId = availableAgent ? availableAgent.agent_id : null;

        runTransaction(db, () => {
          execute(`
            UPDATE conversations SET
              status = 'HUMAN_HANDOFF',
              escalation_reason = ?,
              assigned_agent_id = ?,
              updated_at = ?
            WHERE conversation_id = ?
          `, reason, assignedAgentId, now, context.conversationId);

          execute(`
            INSERT INTO support_tickets (
              ticket_id, customer_id, conversation_id, subject, description,
              category, priority, status, assigned_agent_id, escalation_reason,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'ESCALATION', 'HIGH', 'OPEN', ?, ?, ?, ?)
          `, ticketId, context.customerId, context.conversationId, `Escalation: ${reason.substring(0, 50)}`, reason, assignedAgentId, reason, now, now);

          execute(`
            INSERT INTO messages (message_id, conversation_id, sender_type, content, timestamp)
            VALUES (?, ?, 'SYSTEM', ?, ?)
          `, `msg-${uuidv4().substring(0, 8)}`, context.conversationId, `Conversation escalated to human agent. Reason: "${reason}". Ticket #${ticketId} assigned.`, now);
        });

        result = {
          success: true,
          escalated: true,
          data: {
            status: 'HUMAN_HANDOFF',
            ticketId,
            message: 'I have transferred this conversation to a human support agent. A representative will be with you shortly.',
          },
        };
        break;
      }

      // 13. search_knowledge_base
      case 'search_knowledge_base': {
        const query = args.query;
        const chunks = await searchVectorStore(query, 5, 0.4);

        if (chunks.length === 0) {
          result = {
            success: true,
            data: {
              results: [],
              notice: 'No relevant knowledge documents found for this query in the verified database.',
            },
          };
        } else {
          result = {
            success: true,
            data: {
              results: chunks.map((c) => ({
                title: c.title,
                category: c.category,
                content: c.chunkText,
                similarity: c.similarity,
              })),
            },
          };
        }
        break;
      }

      // 14. search_faq
      case 'search_faq': {
        const query = `%${args.query || ''}%`;
        const faqs = queryAll(`
          SELECT faq_id, question, answer, category
          FROM faqs
          WHERE status = 'PUBLISHED' AND (question LIKE ? OR answer LIKE ? OR category LIKE ?)
          LIMIT 4
        `, query, query, query);

        result = { success: true, data: faqs };
        break;
      }

      default:
        result = { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    logger.error(`Error executing tool ${toolName}:`, { error: err.message });
    result = { success: false, error: err.message || 'Tool execution encountered an internal error.' };
  }

  // Record tool execution
  try {
    execute(`
      INSERT INTO tool_executions (execution_id, conversation_id, tool_name, input, output, status, error, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, execId, context.conversationId, toolName, JSON.stringify(args), JSON.stringify(result.data || null), result.success ? 'SUCCESS' : 'ERROR', result.error || null, now);
  } catch (logErr) {
    logger.warn('Failed recording tool execution audit:', { error: String(logErr) });
  }

  return result;
}
