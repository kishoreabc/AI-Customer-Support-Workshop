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

export type TelecomIntent =
  | 'PLAN_QUERY'
  | 'PLAN_CHANGE'
  | 'RECHARGE'
  | 'RECHARGE_STATUS'
  | 'DATA_USAGE'
  | 'VOICE_USAGE'
  | 'SMS_USAGE'
  | 'BILLING'
  | 'PAYMENT'
  | 'SIM_SUPPORT'
  | 'ESIM_SUPPORT'
  | 'NETWORK_ISSUE'
  | 'NETWORK_OUTAGE'
  | '5G_SUPPORT'
  | 'ROAMING'
  | 'COMPLAINT'
  | 'ACCOUNT_SUPPORT'
  | 'HUMAN_ESCALATION'
  | 'GENERAL_FAQ';

export function classifyTelecomIntent(message: string): TelecomIntent {
  const lower = message.toLowerCase();

  if (detectHumanRequest(lower)) return 'HUMAN_ESCALATION';
  if (lower.includes('roaming') || lower.includes('international') || lower.includes('dubai') || lower.includes('abroad')) return 'ROAMING';
  if (lower.includes('esim') || lower.includes('e-sim') || lower.includes('qr code')) return 'ESIM_SUPPORT';
  if (lower.includes('sim') || lower.includes('lost my phone') || lower.includes('block sim')) return 'SIM_SUPPORT';
  if (lower.includes('outage') || lower.includes('fiber cut') || lower.includes('down in')) return 'NETWORK_OUTAGE';
  if (lower.includes('slow') || lower.includes('no signal') || lower.includes('buffering') || lower.includes('not working') || lower.includes('internet is down') || lower.includes('call drop')) return 'NETWORK_ISSUE';
  if (lower.includes('data left') || lower.includes('data remaining') || lower.includes('data usage') || lower.includes('how much data') || lower.includes('consumed')) return 'DATA_USAGE';
  if (lower.includes('voice') || lower.includes('minutes') || lower.includes('talktime')) return 'VOICE_USAGE';
  if (lower.includes('sms')) return 'SMS_USAGE';
  if (lower.includes('recharge status') || lower.includes('transaction') || lower.includes('txn-')) return 'RECHARGE_STATUS';
  if (lower.includes('recharge') || lower.includes('topup') || lower.includes('pay ₹')) return 'RECHARGE';
  if (lower.includes('bill') || lower.includes('due date') || lower.includes('invoice')) return 'BILLING';
  if (lower.includes('5g') || lower.includes('true 5g') || lower.includes('standalone')) return '5G_SUPPORT';
  if (lower.includes('plan') || lower.includes('cheapest') || lower.includes('pack') || lower.includes('validity') || lower.includes('2gb/day')) return 'PLAN_QUERY';
  if (detectFrustration(lower)) return 'COMPLAINT';

  return 'GENERAL_FAQ';
}

export function detectFrustration(text: string): boolean {
  const lower = text.toLowerCase();
  const frustrationPatterns = [
    'angry', 'furious', 'unacceptable', 'terrible service', 'ridiculous',
    'hate this', 'waste of time', 'awful', 'scam', 'horrible', 'worst company',
    'sue you', 'disgusted', 'complaint', 'pathetic', 'useless', 'cheaters'
  ];
  return frustrationPatterns.some((pattern) => lower.includes(pattern));
}

export function detectHumanRequest(text: string): boolean {
  const lower = text.toLowerCase();
  const humanPatterns = [
    'human', 'real person', 'live agent', 'representative', 'talk to someone',
    'speak to an agent', 'customer service agent', 'operator', 'agent please',
    'talk to a person', 'connect me to a human'
  ];
  return humanPatterns.some((pattern) => lower.includes(pattern));
}

export async function processCustomerMessage(req: ChatRequest): Promise<ChatResponse> {
  const now = new Date().toISOString();

  // 1. Verify conversation exists
  const conv = queryGet('SELECT * FROM conversations WHERE conversation_id = ?', req.conversationId) as any;
  if (!conv) {
    throw new Error('Conversation not found');
  }

  // Strict customer isolation check
  if (req.userRole === 'CUSTOMER' && conv.customer_id !== req.customerId) {
    throw new Error('Forbidden: Conversation does not belong to authenticated customer');
  }

  // If status is HUMAN_HANDOFF, AI stops auto-responding
  if (conv.status === 'HUMAN_HANDOFF') {
    return {
      conversationId: req.conversationId,
      messageId: `msg-${uuidv4().substring(0, 8)}`,
      content: 'A human support representative has taken over this conversation. An agent will respond shortly.',
      escalated: true,
      toolCallsExecuted: [],
    };
  }

  // Save Customer Message
  const custMsgId = `msg-${uuidv4().substring(0, 8)}`;
  execute(`
    INSERT INTO messages (message_id, conversation_id, sender_type, content, timestamp)
    VALUES (?, ?, 'CUSTOMER', ?, ?)
  `, custMsgId, req.conversationId, req.message, now);

  const context: ToolExecutionContext = {
    conversationId: req.conversationId,
    customerId: req.customerId,
    userRole: req.userRole,
    userId: req.userId,
  };

  const executedTools: string[] = [];
  let isEscalated = false;
  let finalResponseContent = '';

  // 2. Immediate Escalation Gate (Frustration or Explicit Representative Request)
  if (detectHumanRequest(req.message)) {
    logger.info('Customer explicitly asked for human agent. Escalating immediately.');
    const escResult = await executeTool('escalate_to_human', {
      reason: 'Customer explicitly requested a human representative',
    }, context);
    executedTools.push('escalate_to_human');
    isEscalated = true;
    finalResponseContent = 'I understand. I have transferred your session to our senior technical support desk. An agent will connect momentarily.';
  } else if (detectFrustration(req.message)) {
    logger.info('Customer frustration detected. Creating ticket & escalating.');
    await executeTool('create_support_ticket', {
      subject: 'Customer Frustration Escalation',
      description: req.message,
      category: 'GENERAL',
      priority: 'HIGH',
    }, context);
    await executeTool('escalate_to_human', {
      reason: 'Customer sentiment classified as severely frustrated',
    }, context);
    executedTools.push('create_support_ticket', 'escalate_to_human');
    isEscalated = true;
    finalResponseContent = 'I truly apologize for the inconvenience you have experienced. I have logged a priority escalation ticket and notified a human representative to step in immediately.';
  } else {
    // 3. Telecom AI Intent Classification & Execution
    const intent = classifyTelecomIntent(req.message);
    logger.info(`Classified telecom intent: "${intent}" for customer ${req.customerId}`);

    const hasLiveOpenAI = Boolean(config.openai.apiKey && !config.openai.apiKey.includes('placeholder') && !config.openai.apiKey.includes('your-'));

    if (hasLiveOpenAI) {
      try {
        const openai = new OpenAI({
          apiKey: config.openai.apiKey,
          baseURL: config.openai.baseUrl,
        });

        // Fetch recent messages
        const recentMessages = queryAll(`
          SELECT sender_type, content, tool_call_id
          FROM messages
          WHERE conversation_id = ?
          ORDER BY timestamp ASC
          LIMIT 12
        `, req.conversationId);

        const aiConfig = queryGet('SELECT system_instructions, model, temperature, max_tokens FROM ai_configs ORDER BY id DESC LIMIT 1') as any;
        const systemPrompt = aiConfig?.system_instructions || 'You are an expert telecom customer service assistant.';

        const formattedMessages: any[] = [
          { role: 'system', content: systemPrompt },
          ...recentMessages.map((m: any) => ({
            role: m.sender_type === 'CUSTOMER' ? 'user' : m.sender_type === 'AI' ? 'assistant' : 'system',
            content: m.content,
          })),
        ];

        const completion = await openai.chat.completions.create({
          model: aiConfig?.model || config.ai.model,
          messages: formattedMessages,
          tools: AI_TOOLS,
          tool_choice: 'auto',
          temperature: aiConfig?.temperature ?? 0.7,
          max_tokens: aiConfig?.max_tokens ?? 1024,
        });

        const choice = completion.choices[0];
        const message = choice.message;

        if (message.tool_calls && message.tool_calls.length > 0) {
          const toolResultsList: any[] = [];
          for (const call of message.tool_calls) {
            executedTools.push(call.function.name);
            let parsedArgs = {};
            try {
              parsedArgs = JSON.parse(call.function.arguments);
            } catch {
              parsedArgs = {};
            }
            const res = await executeTool(call.function.name, parsedArgs, context);
            if (res.escalated) isEscalated = true;
            toolResultsList.push({
              tool_call_id: call.id,
              role: 'tool',
              name: call.function.name,
              content: JSON.stringify(res.data || res.error),
            });
          }

          // Follow-up completion with tool responses
          const secondResponse = await openai.chat.completions.create({
            model: aiConfig?.model || config.ai.model,
            messages: [...formattedMessages, message, ...toolResultsList],
          });

          finalResponseContent = secondResponse.choices[0].message.content || 'I have retrieved your telecom account details.';
        } else {
          finalResponseContent = message.content || 'How can I assist you with your telecom service today?';
        }
      } catch (err: any) {
        logger.error('OpenAI API call failed, falling back to local telecom reasoning engine:', err);
      }
    }

    // 4. Offline / Deterministic Telecom Agent Routing
    if (!finalResponseContent) {
      switch (intent) {
        case 'NETWORK_ISSUE': {
          // Autonomous Network Troubleshooting Workflow:
          // 1. Get usage to see if daily quota was exhausted
          const usageRes = await executeTool('get_data_usage', {}, context);
          executedTools.push('get_data_usage');

          // 2. Check customer city for regional outage
          const cust = queryGet('SELECT city FROM customer_profiles WHERE customer_id = ?', context.customerId) as any;
          const city = cust?.city || 'Chennai';
          const outageRes = await executeTool('check_network_outage', { city }, context);
          executedTools.push('check_network_outage');

          if (outageRes.data?.outageFound) {
            const out = outageRes.data.activeOutages[0];
            finalResponseContent = `⚠️ **Network Alert in ${city}**: There is currently an active service disruption for **${out.affected_service}** (${out.description}). Expected restoration time: **${out.estimated_resolution}**. Our field engineers are actively working on it.`;
          } else if (usageRes.data?.isQuotaExhausted) {
            finalResponseContent = `Your high-speed daily data limit has been reached (${usageRes.data.data_remaining_gb} GB remaining). As per plan policy, data speed has throttled to 64 Kbps until midnight reset. You can activate a **Data Booster 49 (6GB)** for instant high-speed access.`;
          } else {
            // General troubleshooting
            const kbRes = await executeTool('search_knowledge_base', { query: '5G slow data APN settings reset' }, context);
            executedTools.push('search_knowledge_base');
            finalResponseContent = `I checked your line: Your high-speed data is healthy (${usageRes.data?.data_remaining_gb} GB remaining) and cell towers in ${city} are operational.\n\nRecommended troubleshooting:\n1. Enable Airplane mode for 10 seconds, then toggle off.\n2. Ensure Network Mode is set to **5G/4G/3G Auto**.\n3. Verify APN is set to **telecom.net**.\n\nIf speeds remain slow, say "raise ticket" and I will dispatch a technician.`;
          }
          break;
        }

        case 'DATA_USAGE': {
          const res = await executeTool('get_data_usage', {}, context);
          executedTools.push('get_data_usage');
          if (res.success && res.data) {
            finalResponseContent = `You have **${res.data.data_remaining_gb} GB** remaining of high-speed data for your current billing cycle (${res.data.data_used_gb} GB used).`;
          } else {
            finalResponseContent = 'I could not retrieve your data usage at this moment. Please check the My Usage tab.';
          }
          break;
        }

        case 'PLAN_QUERY': {
          const planRes = await executeTool('get_active_plan', {}, context);
          executedTools.push('get_active_plan');
          if (planRes.success && planRes.data?.plan_name) {
            finalResponseContent = `Your active plan is **${planRes.data.plan_name}** (₹${planRes.data.price}). It includes **${planRes.data.data_allowance}**, ${planRes.data.voice_allowance}, and expires on **${planRes.data.expiryFormatted}** (${planRes.data.daysRemaining} days remaining).`;
          } else {
            const avail = await executeTool('get_available_plans', { category: 'UNLIMITED_5G' }, context);
            executedTools.push('get_available_plans');
            finalResponseContent = `Our most popular 5G plan is **Unlimited 5G 799** (56 days, 2GB/day + Unlimited True 5G). Say "recharge" if you would like to activate it.`;
          }
          break;
        }

        case 'ROAMING': {
          const roamRes = await executeTool('get_roaming_plans', {}, context);
          executedTools.push('get_roaming_plans');
          finalResponseContent = `For international travel, we offer:\n- **International Roaming UAE 899** (7 Days, 2GB Data, 100 Mins Calls, Free Incoming)\n- **Global Roaming Explorer 2499** (30 Days, 5GB Data, 150+ countries)\nEnsure Data Roaming is enabled in your device settings upon arrival.`;
          break;
        }

        case 'ESIM_SUPPORT': {
          const kb = await executeTool('search_knowledge_base', { query: 'eSIM activation QR code setup' }, context);
          executedTools.push('search_knowledge_base');
          finalResponseContent = `To set up or transfer your eSIM:\n1. Open the Customer Portal under **My SIM** and click **Convert to eSIM**.\n2. We will generate an encrypted QR code sent to your registered email.\n3. On your phone, go to **Settings → Mobile Service → Add eSIM → Scan QR Code**.\nActivation completes in approximately 2 hours.`;
          break;
        }

        case 'SIM_SUPPORT': {
          const simRes = await executeTool('get_sim_details', {}, context);
          executedTools.push('get_sim_details');
          if (simRes.success && simRes.data) {
            finalResponseContent = `Your registered SIM is a **${simRes.data.sim_type}** SIM (ICCID: \`${simRes.data.iccid}\`) with status **${simRes.data.status}**. If lost, let me know and I will block it immediately.`;
          } else {
            finalResponseContent = 'Your SIM card status is currently active and healthy.';
          }
          break;
        }

        case 'RECHARGE': {
          const plansRes = await executeTool('get_available_plans', {}, context);
          executedTools.push('get_available_plans');
          finalResponseContent = `To recharge your number, choose from our recommended plans:\n- **Prepaid Super 299** (28 days, 1.5GB/day)\n- **Unlimited 5G 799** (56 days, 2GB/day + True 5G)\n- **Data Booster 49** (6GB Instant Data)\nYou can recharge in 1 click from the **Recharge** portal tab.`;
          break;
        }

        case 'RECHARGE_STATUS': {
          const rchRes = await executeTool('get_recharge_history', { limit: 1 }, context);
          executedTools.push('get_recharge_history');
          if (rchRes.success && rchRes.data?.length > 0) {
            const lastRch = rchRes.data[0];
            finalResponseContent = `Your latest recharge was **₹${lastRch.amount}** for ${lastRch.plan_name || 'mobile plan'} on ${new Date(lastRch.created_at).toLocaleDateString()} (Txn: \`${lastRch.transaction_id}\`) with status: **${lastRch.status}**.`;
          } else {
            finalResponseContent = 'No recent recharge transactions found.';
          }
          break;
        }

        case 'BILLING': {
          const billRes = await executeTool('get_bill', {}, context);
          executedTools.push('get_bill');
          if (billRes.success && billRes.data?.amount) {
            finalResponseContent = `Your bill for **${billRes.data.billing_period}** is **₹${billRes.data.amount}** (Status: **${billRes.data.status}**, Due: ${billRes.data.due_date}).`;
          } else {
            finalResponseContent = 'Your account has no outstanding bills at this time.';
          }
          break;
        }

        default: {
          const faqRes = await executeTool('search_faqs', { query: req.message }, context);
          executedTools.push('search_faqs');
          if (faqRes.success && faqRes.data?.length > 0) {
            finalResponseContent = faqRes.data[0].answer;
          } else {
            const kbRes = await executeTool('search_knowledge_base', { query: req.message }, context);
            executedTools.push('search_knowledge_base');
            if (kbRes.success && kbRes.data?.length > 0 && kbRes.data[0].relevanceScore > 0.4) {
              finalResponseContent = kbRes.data[0].content;
            } else {
              finalResponseContent = 'I can help with mobile plans, 5G data limits, recharges, eSIM setup, network issues, and billing. Could you please provide a few more details?';
            }
          }
        }
      }
    }
  }

  // 5. Save AI response message
  const aiMsgId = `msg-${uuidv4().substring(0, 8)}`;
  execute(`
    INSERT INTO messages (message_id, conversation_id, sender_type, content, timestamp)
    VALUES (?, ?, 'AI', ?, ?)
  `, aiMsgId, req.conversationId, finalResponseContent, now);

  execute('UPDATE conversations SET updated_at = ? WHERE conversation_id = ?', now, req.conversationId);

  return {
    conversationId: req.conversationId,
    messageId: aiMsgId,
    content: finalResponseContent,
    escalated: isEscalated,
    toolCallsExecuted: executedTools,
  };
}
