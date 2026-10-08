import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { queryGet, queryAll, execute } from '../database/connection.js';
import { config } from '../config.js';
import { AI_TOOLS } from './tool-definitions.js';
import { executeTool, ToolExecutionContext } from './tool-executor.js';
import { logger } from '../utils/logger.js';

export interface ChatRequest {
  conversationId: string;
  customerId: string;
  message: string;
  userRole: 'ADMIN' | 'SUPPORT_AGENT' | 'CUSTOMER';
  userId: string;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
  escalated: boolean;
  ticketId?: string;
  toolCallsExecuted: string[];
}

export function detectFrustration(text: string): boolean {
  const lower = text.toLowerCase();
  const frustrationPatterns = [
    'angry', 'furious', 'unacceptable', 'terrible service', 'ridiculous',
    'hate this', 'waste of time', 'awful', 'scam', 'horrible', 'worst company',
    'sue you', 'disgusted', 'complaint'
  ];
  return frustrationPatterns.some((pattern) => lower.includes(pattern));
}

export function detectHumanRequest(text: string): boolean {
  const lower = text.toLowerCase();
  const humanPatterns = [
    'human', 'real person', 'live agent', 'representative', 'talk to someone',
    'speak to an agent', 'customer service agent', 'operator', 'agent please'
  ];
  return humanPatterns.some((pattern) => lower.includes(pattern));
}

export async function processCustomerMessage(req: ChatRequest): Promise<ChatResponse> {
  const now = new Date().toISOString();

  // 1. Verify conversation
  const conv = queryGet('SELECT * FROM conversations WHERE conversation_id = ?', req.conversationId) as any;
  if (!conv) {
    throw new Error('Conversation not found');
  }

  // Security isolation check
  if (req.userRole === 'CUSTOMER' && conv.customer_id !== req.customerId) {
    throw new Error('Forbidden: Conversation does not belong to authenticated customer');
  }

  // If status is HUMAN_HANDOFF, AI stops auto-responding
  if (conv.status === 'HUMAN_HANDOFF') {
    const userMsgId = `msg-${uuidv4().substring(0, 8)}`;
    execute(`
      INSERT INTO messages (message_id, conversation_id, sender_type, content, timestamp)
      VALUES (?, ?, 'CUSTOMER', ?, ?)
    `, userMsgId, req.conversationId, req.message, now);

    execute('UPDATE conversations SET updated_at = ? WHERE conversation_id = ?', now, req.conversationId);

    return {
      conversationId: req.conversationId,
      messageId: userMsgId,
      content: 'Your message has been received by your assigned human support agent. They will reply to you directly.',
      escalated: true,
      toolCallsExecuted: [],
    };
  }

  if (conv.status === 'RESOLVED' || conv.status === 'CLOSED') {
    throw new Error('This conversation is already closed or resolved. Please start a new support conversation.');
  }

  // 2. Insert customer message
  const userMsgId = `msg-${uuidv4().substring(0, 8)}`;
  execute(`
    INSERT INTO messages (message_id, conversation_id, sender_type, content, timestamp)
    VALUES (?, ?, 'CUSTOMER', ?, ?)
  `, userMsgId, req.conversationId, req.message, now);

  // 3. Load active AI prompt and config
  const aiConfig = (queryGet('SELECT * FROM ai_configs ORDER BY id DESC LIMIT 1') as any) || {
    model: config.ai.model,
    system_instructions: 'You are a helpful AI customer support agent.',
    temperature: 0.7,
    max_tokens: 1024,
    max_conversation_history: 20,
    ai_enabled: 1,
  };

  if (!aiConfig.ai_enabled) {
    return {
      conversationId: req.conversationId,
      messageId: `msg-${uuidv4().substring(0, 8)}`,
      content: 'Our automated support system is currently offline for maintenance. A human support specialist will assist you.',
      escalated: true,
      toolCallsExecuted: [],
    };
  }

  // 4. Retrieve authenticated customer profile
  const customerProfile = queryGet('SELECT customer_id, first_name, last_name, email FROM customer_profiles WHERE customer_id = ?', req.customerId) as any;

  // 5. Check immediate human escalation rules
  const userRequestedHuman = detectHumanRequest(req.message);
  const userIsFrustrated = detectFrustration(req.message);

  const context: ToolExecutionContext = {
    conversationId: req.conversationId,
    customerId: req.customerId,
    userRole: req.userRole,
    userId: req.userId,
  };

  if (userRequestedHuman) {
    logger.info('Customer explicitly asked for human agent. Escalating immediately.');
    const escResult = await executeTool('escalate_to_human', { reason: 'Customer explicitly requested a human representative' }, context);
    const replyContent = "I have connected you with our human support team. A specialist has been assigned to your case and will respond here shortly.";

    const aiMsgId = `msg-${uuidv4().substring(0, 8)}`;
    execute(`
      INSERT INTO messages (message_id, conversation_id, sender_type, content, timestamp)
      VALUES (?, ?, 'AI', ?, ?)
    `, aiMsgId, req.conversationId, replyContent, now);

    return {
      conversationId: req.conversationId,
      messageId: aiMsgId,
      content: replyContent,
      escalated: true,
      ticketId: escResult.data?.ticketId,
      toolCallsExecuted: ['escalate_to_human'],
    };
  }

  // 6. Build conversation memory
  const historyLimit = aiConfig.max_conversation_history || 20;
  const historyRows = queryAll(`
    SELECT sender_type, content
    FROM messages
    WHERE conversation_id = ?
    ORDER BY id ASC
    LIMIT ?
  `, req.conversationId, historyLimit);

  // 7. System prompt
  const systemPrompt = `
${aiConfig.system_instructions}

CURRENT SESSION CONTEXT:
- Authenticated Customer ID: ${req.customerId}
- Customer Name: ${customerProfile ? `${customerProfile.first_name} ${customerProfile.last_name}` : 'Unknown'}
- Customer Email: ${customerProfile?.email || 'Unknown'}
- Frustration Signal: ${userIsFrustrated ? 'DETECTED. Be extra empathetic and offer human escalation if unresolved.' : 'Normal'}

IMPORTANT: You only have access to information regarding THIS customer. Always use tools to verify facts. Never fabricate policies, orders, or tracking details.
  `.trim();

  const messagesPayload: any[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const row of historyRows) {
    const role = row.sender_type === 'CUSTOMER' ? 'user' : (row.sender_type === 'AI' ? 'assistant' : 'system');
    messagesPayload.push({ role, content: row.content });
  }

  // 8. Call LLM or local response
  let finalContent = '';
  let escalated = false;
  let ticketId: string | undefined;
  const toolCallsExecuted: string[] = [];

  const hasOpenAI = Boolean(config.openai.apiKey && config.openai.apiKey !== 'your-api-key');

  if (hasOpenAI) {
    const openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseUrl,
    });

    let turns = 0;
    while (turns < 5) {
      turns++;

      const completion = await openai.chat.completions.create({
        model: aiConfig.model || 'gpt-4o-mini',
        messages: messagesPayload,
        tools: AI_TOOLS,
        tool_choice: 'auto',
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.max_tokens,
      });

      const responseMessage = completion.choices[0]?.message;
      if (!responseMessage) break;

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        messagesPayload.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
          toolCallsExecuted.push(toolCall.function.name);
          let args = {};
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            args = {};
          }

          const toolRes = await executeTool(toolCall.function.name, args, context);
          if (toolRes.escalated) {
            escalated = true;
            ticketId = toolRes.data?.ticketId;
          }

          messagesPayload.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolRes.data || { error: toolRes.error }),
          });
        }
      } else {
        finalContent = responseMessage.content || '';
        break;
      }
    }
  } else {
    finalContent = await generateSmartLocalResponse(req.message, context, toolCallsExecuted);
  }

  if (!finalContent) {
    finalContent = "I apologize, but I am having trouble processing your request at the moment. Would you like me to connect you with a human representative?";
  }

  // 9. Save AI response
  const aiMsgId = `msg-${uuidv4().substring(0, 8)}`;
  execute(`
    INSERT INTO messages (message_id, conversation_id, sender_type, content, timestamp)
    VALUES (?, ?, 'AI', ?, ?)
  `, aiMsgId, req.conversationId, finalContent, now);

  execute('UPDATE conversations SET updated_at = ? WHERE conversation_id = ?', now, req.conversationId);

  return {
    conversationId: req.conversationId,
    messageId: aiMsgId,
    content: finalContent,
    escalated,
    ticketId,
    toolCallsExecuted,
  };
}

async function generateSmartLocalResponse(
  userText: string,
  context: ToolExecutionContext,
  toolsExecuted: string[]
): Promise<string> {
  const lower = userText.toLowerCase();

  // 1. Order status inquiry
  if (lower.includes('order') || lower.includes('shipping') || lower.includes('where is') || lower.includes('track')) {
    toolsExecuted.push('get_customer_orders');
    const orderRes = await executeTool('get_customer_orders', { limit: 3 }, context);
    const orders = orderRes.data || [];

    if (orders.length === 0) {
      return "I checked our records and do not see any active or previous orders associated with your account.";
    }

    const latest = orders[0];
    toolsExecuted.push('get_order_status');
    const statusRes = await executeTool('get_order_status', { orderId: latest.order_id }, context);
    const s = statusRes.data;

    return `I found your recent order **#${latest.order_id}** placed on ${new Date(latest.order_date).toLocaleDateString()}.\n\n` +
      `- **Status:** ${s.status}\n` +
      `- **Tracking Number:** ${s.trackingNumber || 'Pending carrier assignment'}\n` +
      `- **Estimated Delivery:** ${s.estimatedDeliveryDate ? new Date(s.estimatedDeliveryDate).toLocaleDateString() : 'In transit'}\n` +
      `- **Total:** $${latest.total_amount} ${latest.currency}\n\n` +
      `Is there anything else you would like to know about this shipment?`;
  }

  // 2. Return / Refund inquiry
  if (lower.includes('return') || lower.includes('refund') || lower.includes('money back')) {
    toolsExecuted.push('search_knowledge_base');
    await executeTool('search_knowledge_base', { query: 'return and refund policy' }, context);
    toolsExecuted.push('get_customer_orders');
    const ordersRes = await executeTool('get_customer_orders', { limit: 1 }, context);
    const latest = (ordersRes.data || [])[0];

    let returnAdvice = "According to our **Global Return Policy**, products can be returned within **30 days of delivery** in their original packaging for a full refund.";
    if (latest) {
      toolsExecuted.push('get_refund_status');
      const refStatus = await executeTool('get_refund_status', { orderId: latest.order_id }, context);
      returnAdvice += `\n\nFor your latest order **#${latest.order_id}**, it is currently **${refStatus.data?.eligibility || 'ELIGIBLE'}** for return processing.`;
    }

    return returnAdvice + "\n\nWould you like me to generate a return ticket or connect you with a representative to finalize this?";
  }

  // 3. Warranty inquiry
  if (lower.includes('warranty') || lower.includes('broken') || lower.includes('repair') || lower.includes('defect')) {
    toolsExecuted.push('search_knowledge_base');
    await executeTool('search_knowledge_base', { query: 'warranty coverage' }, context);
    return "All our hardware products come with comprehensive warranty coverage: **2 years** on Laptops, **1 year** on Headphones and Docks, **3 years** on Monitors, and **5 years** on Chairs. It covers manufacturing and hardware defects with an average turnaround of 5 business days.";
  }

  // 4. Product inquiries
  if (lower.includes('laptop') || lower.includes('ultrabook') || lower.includes('monitor') || lower.includes('headphone') || lower.includes('chair') || lower.includes('dock') || lower.includes('product') || lower.includes('spec')) {
    toolsExecuted.push('search_products');
    const prodRes = await executeTool('search_products', { query: userText }, context);
    const prods = prodRes.data || [];
    if (prods.length > 0) {
      const p = prods[0];
      return `Here is the information on the **${p.name}** (SKU: \`${p.sku}\`):\n\n` +
        `- **Price:** $${p.price} ${p.currency}\n` +
        `- **Availability:** ${p.availability_status} (${p.stock_quantity} units available)\n` +
        `- **Warranty:** ${p.warranty_information}\n` +
        `- **Return Policy:** ${p.return_policy}`;
    }
  }

  // 5. FAQ Search fallback
  toolsExecuted.push('search_faq');
  const faqRes = await executeTool('search_faq', { query: userText }, context);
  const faqs = faqRes.data || [];
  if (faqs.length > 0) {
    return `${faqs[0].answer}\n\n*(From FAQ: ${faqs[0].question})*`;
  }

  // 6. General RAG
  toolsExecuted.push('search_knowledge_base');
  const kbRes = await executeTool('search_knowledge_base', { query: userText }, context);
  const chunks = kbRes.data?.results || [];
  if (chunks.length > 0) {
    return chunks[0].content;
  }

  return "I understand your inquiry. To give you the most accurate help, could you provide more details such as your order number, or would you prefer to speak directly with a human support specialist?";
}
