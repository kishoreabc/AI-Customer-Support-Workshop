import bcrypt from 'bcryptjs';
import { getDatabase, runTransaction } from './connection.js';
import { initializeSchema } from './schema.js';
import { generateEmbedding } from '../services/embedding.js';
import { logger } from '../utils/logger.js';

export async function seedDatabase(force: boolean = false): Promise<void> {
  const db = getDatabase();
  initializeSchema(db);

  if (!force) {
    logger.info('Checking if database already has seed data...');
    const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const planCountRow = db.prepare('SELECT COUNT(*) as count FROM telecom_plans').get() as { count: number };
    if (userCountRow && userCountRow.count > 0 && planCountRow && planCountRow.count > 0) {
      logger.info('Database already seeded with telecom records. Skipping.');
      return;
    }
  }

  logger.info('Seeding fresh telecom demo data...');

  const passwordHash = await bcrypt.hash('password123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const agentPasswordHash = await bcrypt.hash('agent123', 10);

  const now = new Date().toISOString();

  runTransaction(db, () => {
    // 1. Users
    const insertUser = db.prepare(`
      INSERT INTO users (user_id, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertUser.run('usr-admin-1', 'admin@company.com', adminPasswordHash, 'ADMIN', now);
    insertUser.run('usr-agent-1', 'sarah@company.com', agentPasswordHash, 'SUPPORT_AGENT', now);
    insertUser.run('usr-cust-1', 'alice@example.com', passwordHash, 'CUSTOMER', now);
    insertUser.run('usr-cust-2', 'bob@example.com', passwordHash, 'CUSTOMER', now);

    // 2. Customer Profiles (Subscribers)
    const insertCustomer = db.prepare(`
      INSERT INTO customer_profiles (
        customer_id, user_id, first_name, last_name, email, phone, phone_number,
        alternate_number, date_of_birth, address, city, state, country, postal_code,
        pincode, customer_status, customer_since, account_created_at, notes, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertCustomer.run(
      'cust-1',
      'usr-cust-1',
      'Alice',
      'Sharma',
      'alice@example.com',
      '+91 98765 43210',
      '+91 98765 43210',
      '+91 98765 99999',
      '1992-05-14',
      'Flat 402, Sea Breeze Apts, Bandra West',
      'Mumbai',
      'Maharashtra',
      'India',
      '400050',
      '400050',
      'ACTIVE',
      '2022-01-15',
      now,
      'High-value 5G unlimited subscriber with eSIM',
      JSON.stringify(['5G_PREMIUM', 'ESIM_USER', 'HIGH_VALUE'])
    );

    insertCustomer.run(
      'cust-2',
      'usr-cust-2',
      'Bob',
      'Patel',
      'bob@example.com',
      '+91 98765 87654',
      '+91 98765 87654',
      null,
      '1988-11-20',
      '12th Cross, T Nagar',
      'Chennai',
      'Tamil Nadu',
      'India',
      '600017',
      '600017',
      'ACTIVE',
      '2023-04-10',
      now,
      'Prepaid subscriber in Chennai experiencing tower congestion',
      JSON.stringify(['PREPAID', 'PHYSICAL_SIM'])
    );

    // 3. Admin & Agent Profiles
    db.prepare(`
      INSERT INTO admin_users (admin_id, user_id, name, department, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('adm-1', 'usr-admin-1', 'System Administrator', 'Network Operations & AI Platform', 'ACTIVE', now);

    db.prepare(`
      INSERT INTO support_agents (agent_id, user_id, name, email, role, status, department, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('agt-1', 'usr-agent-1', 'Sarah Jenkins', 'sarah@company.com', 'SUPPORT_AGENT', 'ACTIVE', 'Priority Network & Technical Desk', now, now);

    // 4. Telecom Plans
    const insertPlan = db.prepare(`
      INSERT INTO telecom_plans (
        plan_id, name, description, price, currency, validity_days, data_allowance,
        voice_allowance, sms_allowance, network_type, is_5g, roaming_available, category, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertPlan.run(
      'plan-5g-799',
      'Unlimited 5G 799',
      'Best-seller 5G plan: 2GB daily 4G data + Unlimited True 5G data with unlimited national voice calling.',
      799,
      'INR',
      56,
      '2GB/day + Unlimited True 5G',
      'Unlimited national calling',
      '100 SMS/day',
      '5G',
      1,
      1,
      'UNLIMITED_5G',
      'ACTIVE',
      now,
      now
    );

    insertPlan.run(
      'plan-prep-299',
      'Prepaid Super 299',
      'Popular monthly prepaid plan: 1.5GB daily data with unlimited voice and 100 SMS/day.',
      299,
      'INR',
      28,
      '1.5GB/day',
      'Unlimited national calling',
      '100 SMS/day',
      '5G',
      1,
      0,
      'POPULAR_MONTHLY',
      'ACTIVE',
      now,
      now
    );

    insertPlan.run(
      'plan-hero-2999',
      'Annual Hero 2999',
      '365-day annual pack: 2.5GB/day high speed data + Unlimited True 5G data, premium OTT bundle, and VIP support.',
      2999,
      'INR',
      365,
      '2.5GB/day + Unlimited True 5G',
      'Unlimited national calling',
      '100 SMS/day',
      '5G',
      1,
      1,
      'ANNUAL',
      'ACTIVE',
      now,
      now
    );

    insertPlan.run(
      'plan-roam-uae-899',
      'International Roaming UAE 899',
      '7-day international roaming pack for Dubai & UAE: 2GB data, 100 mins outgoing calls, free incoming calls.',
      899,
      'INR',
      7,
      '2GB High Speed Data',
      '100 Mins Outgoing, Free Incoming',
      '50 SMS',
      '5G',
      1,
      1,
      'INTERNATIONAL_ROAMING',
      'ACTIVE',
      now,
      now
    );

    insertPlan.run(
      'plan-roam-global-2499',
      'Global Roaming Explorer 2499',
      '30-day global international roaming for 150+ countries (USA, UK, Europe, Asia, UAE): 5GB data, 200 outgoing mins, free incoming.',
      2499,
      'INR',
      30,
      '5GB Global Data',
      '200 Mins Outgoing, Free Incoming',
      '100 SMS',
      '5G',
      1,
      1,
      'INTERNATIONAL_ROAMING',
      'ACTIVE',
      now,
      now
    );

    insertPlan.run(
      'plan-booster-49',
      'Data Booster 49',
      'Instant 6GB high-speed 4G/5G data booster pack valid until midnight.',
      49,
      'INR',
      1,
      '6GB Instant High Speed Data',
      'N/A (Data Only)',
      'N/A',
      '5G',
      1,
      0,
      'DATA_ADDON',
      'ACTIVE',
      now,
      now
    );

    // 5. Subscriptions
    const insertSub = db.prepare(`
      INSERT INTO subscriptions (
        subscription_id, customer_id, plan_id, mobile_number, activation_date, expiry_date, status, auto_renew, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSub.run(
      'sub-1001',
      'cust-1',
      'plan-5g-799',
      '+91 98765 43210',
      '2026-09-15T00:00:00.000Z',
      '2026-11-10T23:59:59.000Z',
      'ACTIVE',
      1,
      now,
      now
    );

    insertSub.run(
      'sub-1002',
      'cust-2',
      'plan-prep-299',
      '+91 98765 87654',
      '2026-09-20T00:00:00.000Z',
      '2026-10-18T23:59:59.000Z',
      'ACTIVE',
      0,
      now,
      now
    );

    // 6. Subscriber Live Usage
    const insertUsage = db.prepare(`
      INSERT INTO telecom_usage (
        usage_id, customer_id, mobile_number, data_used_gb, data_remaining_gb, voice_used_mins, voice_remaining_mins, sms_used, sms_remaining, period_start, period_end, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Alice has 7.4 GB remaining of her high-speed quota (healthy)
    insertUsage.run(
      'usg-1001',
      'cust-1',
      '+91 98765 43210',
      2.6,
      7.4,
      340,
      -1,
      12,
      88,
      '2026-10-01T00:00:00.000Z',
      '2026-10-31T23:59:59.000Z',
      now
    );

    // Bob has only 0.1 GB remaining (almost exhausted, explanation for slow speeds)
    insertUsage.run(
      'usg-1002',
      'cust-2',
      '+91 98765 87654',
      1.4,
      0.1,
      520,
      -1,
      45,
      55,
      '2026-10-01T00:00:00.000Z',
      '2026-10-31T23:59:59.000Z',
      now
    );

    // 7. Recharges
    const insertRecharge = db.prepare(`
      INSERT INTO recharges (
        recharge_id, customer_id, mobile_number, plan_id, amount, payment_method, transaction_id, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRecharge.run(
      'rch-2001',
      'cust-1',
      '+91 98765 43210',
      'plan-5g-799',
      799,
      'UPI_GPAY',
      'TXN-UPI-98761234',
      'SUCCESS',
      '2026-09-15T10:30:00.000Z'
    );

    insertRecharge.run(
      'rch-2002',
      'cust-1',
      '+91 98765 43210',
      'plan-booster-49',
      49,
      'CREDIT_CARD',
      'TXN-CC-88273611',
      'SUCCESS',
      '2026-10-02T14:15:00.000Z'
    );

    insertRecharge.run(
      'rch-2003',
      'cust-2',
      '+91 98765 87654',
      'plan-prep-299',
      299,
      'UPI_PHONEPE',
      'TXN-UPI-77162534',
      'SUCCESS',
      '2026-09-20T18:00:00.000Z'
    );

    // 8. Postpaid Bills & Payments
    const insertBill = db.prepare(`
      INSERT INTO bills (
        bill_id, customer_id, mobile_number, billing_period, amount, due_date, status, breakdown_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertBill.run(
      'bill-3001',
      'cust-1',
      '+91 98765 43210',
      'Sep 2026',
      799,
      '2026-10-15',
      'PAID',
      JSON.stringify({ planCharges: 677.12, gst18Percent: 121.88, discount: 0, total: 799 }),
      '2026-10-01T00:00:00.000Z'
    );

    insertBill.run(
      'bill-3002',
      'cust-1',
      '+91 98765 43210',
      'Aug 2026',
      799,
      '2026-09-15',
      'PAID',
      JSON.stringify({ planCharges: 677.12, gst18Percent: 121.88, discount: 0, total: 799 }),
      '2026-09-01T00:00:00.000Z'
    );

    // 9. SIM Cards
    const insertSim = db.prepare(`
      INSERT INTO sim_cards (
        sim_id, customer_id, mobile_number, sim_type, iccid, imsi, status, activated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSim.run(
      'sim-4001',
      'cust-1',
      '+91 98765 43210',
      'ESIM',
      '89910012345678901234',
      '404450123456789',
      'ACTIVE',
      '2022-01-15T12:00:00.000Z'
    );

    insertSim.run(
      'sim-4002',
      'cust-2',
      '+91 98765 87654',
      'PHYSICAL',
      '89910098765432109876',
      '404450987654321',
      'ACTIVE',
      '2023-04-10T09:30:00.000Z'
    );

    // 10. Network Outages
    const insertOutage = db.prepare(`
      INSERT INTO network_outages (
        outage_id, region, city, affected_service, network_type, severity, status, start_time, estimated_resolution, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertOutage.run(
      'OUT-2026-CH01',
      'Tamil Nadu',
      'Chennai',
      '5G Mobile Data & High-Speed Internet',
      '5G',
      'MAJOR',
      'IN_PROGRESS',
      '2026-10-08T06:00:00.000Z',
      'Today, 8:00 PM IST',
      'Subsea cable landing station optical fiber cut near Guindy substation causing packet loss and degraded 5G mobile broadband speeds across Chennai south.',
      now,
      now
    );

    insertOutage.run(
      'OUT-2026-PU02',
      'Maharashtra',
      'Pune',
      'VoLTE Voice Calling',
      '4G',
      'MINOR',
      'INVESTIGATING',
      '2026-10-08T09:15:00.000Z',
      'Today, 6:00 PM IST',
      'Scheduled cell tower maintenance at Hinjewadi Phase 3. Voice calls may momentarily fall back to 3G/2G.',
      now,
      now
    );

    // 11. Support Tickets
    const insertTicket = db.prepare(`
      INSERT INTO support_tickets (
        ticket_id, customer_id, subject, description, category, priority, status, assigned_agent_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTicket.run(
      'TCK-101',
      'cust-1',
      'Inquiry about International Roaming activation in Dubai',
      'Customer travelling to UAE on Friday and requesting confirmation of roaming pack coverage.',
      'ROAMING',
      'LOW',
      'RESOLVED',
      'agt-1',
      '2026-10-05T11:00:00.000Z',
      now
    );

    insertTicket.run(
      'TCK-102',
      'cust-2',
      'Extremely slow internet and buffering in T Nagar Chennai',
      'Customer reports speed test below 1 Mbps on 5G device.',
      'NETWORK',
      'HIGH',
      'IN_PROGRESS',
      'agt-1',
      '2026-10-08T08:30:00.000Z',
      now
    );

    // 12. Knowledge Documents (Telecom Guides)
    const insertDoc = db.prepare(`
      INSERT INTO knowledge_documents (
        document_id, title, content, category, tags, source, status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'MANUAL', 'PUBLISHED', 'admin@company.com', ?, ?)
    `);

    insertDoc.run(
      'doc-5g-troubleshooting',
      '5G Network Troubleshooting & True 5G SA Setup Guide',
      `Comprehensive guide for troubleshooting mobile network and 5G connectivity issues:
1. Verify 5G SA Compatibility: Ensure device supports 5G bands n28, n78, n258. Check device Settings -> Mobile Network -> Network Mode -> Select "5G/4G/3G Auto".
2. Check APN Settings: APN Name should be set to "telecom.net" with APN Protocol IPv4/IPv6.
3. Daily Data Limit Check: Once daily data quota (e.g. 1.5GB/day or 2GB/day) is exhausted, speed drops to 64 Kbps unless an active Data Booster add-on is applied.
4. Active Outages: Check city-specific fiber cuts or scheduled tower maintenance. If an outage is active in your area, technicians are dispatched for restoration.
5. Quick Reset: Toggle Airplane Mode ON for 10 seconds and turn it OFF. Restart device if signal bars do not refresh.`,
      'Network',
      JSON.stringify(['5G', 'SPEED', 'TROUBLESHOOTING', 'APN', 'NETWORK']),
      now,
      now
    );

    insertDoc.run(
      'doc-esim-guide',
      'eSIM Activation, Setup & Transfer Procedure',
      `Step-by-step instructions for activating or transferring an eSIM:
1. Eligibility: Supported on Apple iPhone XR or newer, Samsung Galaxy S20+, Google Pixel 4a+.
2. Request eSIM QR: In the Customer Portal under "My SIM", request an eSIM transfer. An encrypted QR code is delivered to your verified email address.
3. iOS Setup: Go to Settings -> Mobile Service -> Add eSIM -> Use QR Code -> Scan the provided QR code with device camera.
4. Android Setup: Go to Settings -> Network & Internet -> SIMs -> Download a SIM -> Scan QR code.
5. Verification: Do not delete your old physical SIM until the eSIM shows active signal bars. EID authentication takes approximately 2 hours.
6. Lost Device Emergency: If your eSIM device is lost, immediately use the "Block SIM" tool in the portal to prevent unauthorized OTP verification.`,
      'SIM/eSIM',
      JSON.stringify(['ESIM', 'ACTIVATION', 'QR_CODE', 'SIM_REPLACEMENT']),
      now,
      now
    );

    insertDoc.run(
      'doc-roaming-guide',
      'International & Domestic Roaming Usage Policies',
      `Telecom roaming policies and international connectivity rules:
1. Domestic Roaming: 100% Free across all states and union territories in India. No extra charge for data, incoming calls, or SMS.
2. International Roaming: To avoid standard pay-as-you-go rates, activate an International Roaming Pack before boarding your flight.
3. Popular Packs: UAE 899 Pack (7 days, 2GB, 100 Mins) and Global Explorer 2499 Pack (30 days, 5GB, 200 Mins, 150+ countries).
4. On Arrival: Ensure "Data Roaming" is toggled ON under phone Cellular settings. Your phone will automatically register with partner tier-1 telco networks.`,
      'Roaming',
      JSON.stringify(['ROAMING', 'INTERNATIONAL', 'DUBAI', 'TRAVEL']),
      now,
      now
    );

    insertDoc.run(
      'doc-recharge-billing',
      'Recharge Cycles, Bill Payments & Refund Policy',
      `Understanding prepaid validity, bill breakdowns, and payment policies:
1. Plan Validity: 28 days, 56 days, 84 days, or 365 days from the exact timestamp of successful recharge.
2. Advance Recharges: You can recharge in advance. Queued plans automatically activate the moment your current active plan expires without losing data.
3. Failed Transaction Resolution: If payment was debited via UPI or Credit Card but recharge was not credited, payment gateway auto-reverses funds within 24 to 48 hours.
4. Postpaid Bills: Invoiced on the 1st of every month with a 15-day grace payment period before late fees.`,
      'Billing',
      JSON.stringify(['RECHARGE', 'BILLING', 'PAYMENT', 'REFUND', 'VALIDITY']),
      now,
      now
    );

    // 13. Telecom FAQs
    const insertFaq = db.prepare(`
      INSERT INTO faqs (faq_id, question, answer, category, tags, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'PUBLISHED', ?, ?)
    `);

    insertFaq.run(
      'faq-1',
      'Why is my internet slow or 5G not showing up?',
      'Slow speeds typically occur if: (1) your daily high-speed data quota has been reached (speeds reset daily at midnight), (2) 5G is not enabled in phone settings (switch Network Mode to 5G Auto), or (3) there is an active network outage or maintenance in your city. Check the "My Usage" tab to verify remaining data.',
      'Network',
      JSON.stringify(['5G', 'SLOW_INTERNET', 'NETWORK']),
      now,
      now
    );

    insertFaq.run(
      'faq-2',
      'How do I check my remaining data and plan expiry?',
      'You can ask the AI Support Agent "How much data do I have left?" or view your real-time meters in the "My Usage" dashboard tab.',
      'Plans',
      JSON.stringify(['DATA_USAGE', 'BALANCE', 'PLAN_EXPIRY']),
      now,
      now
    );

    insertFaq.run(
      'faq-3',
      'How can I switch my physical SIM card to an eSIM?',
      'Navigate to the "My SIM" section on the Customer Portal, select "Convert to eSIM", and verify your device EID. You will receive an activation QR code on your registered email address.',
      'SIM/eSIM',
      JSON.stringify(['ESIM', 'CONVERT_SIM', 'QR_CODE']),
      now,
      now
    );

    insertFaq.run(
      'faq-4',
      'What happens if my recharge money was deducted but not activated?',
      'If your account was debited but plan didn\'t update, check your transaction ID under "Recharges". Our payment gateway reconciles pending bank statuses within 15 minutes. If still unresolved, our AI or human agent can open an immediate billing ticket.',
      'Recharge',
      JSON.stringify(['FAILED_RECHARGE', 'UPI_DEBITED', 'PAYMENT_PENDING']),
      now,
      now
    );

    insertFaq.run(
      'faq-5',
      'Is 5G unlimited really unlimited?',
      'Yes! True 5G data is 100% unlimited and free on all eligible 5G plans (such as the Unlimited 5G 799 or Annual 2999 packs) in areas with 5G network coverage.',
      '5G',
      JSON.stringify(['TRUE_5G', 'UNLIMITED_DATA', '5G_OFFER']),
      now,
      now
    );

    // 14. AI System Configuration & System Prompt
    const telecomSystemPrompt = `You are the Telecom AI Customer Support & Service Management Agent for Telecom One.
Your mission is to provide fast, reliable, accurate, and empathetic assistance to subscribers regarding:
- Mobile Plans (Prepaid, Postpaid, Unlimited 5G, Annual Packs, Data Boosters)
- Recharges (Balance, transactions, recharging numbers)
- Data, Voice & SMS Usage (Daily limits, remaining quota, reset times)
- Network Troubleshooting (Slow data, no signal, call drops, 5G SA configuration)
- Regional Network Outages (Checking active fiber cuts, tower incidents, and restoration ETAs)
- SIM & eSIM Management (eSIM setup, QR codes, blocking lost SIMs)
- Postpaid Bills & Payments
- International & Domestic Roaming

CRITICAL RULES:
1. ONLY access data belonging to the authenticated customer. NEVER reveal another customer's mobile number, usage, or personal records.
2. NEVER fabricate or hallucinate plans, prices, usage balances, recharge status, or outage information. Always call the corresponding tool.
3. For network issues, follow the standard troubleshooting workflow:
   a. Check customer's active plan and data balance (verify if high speed daily quota is exhausted).
   b. Check if there is an active network outage in customer's city.
   c. If an outage exists, explain the outage details, affected service, and estimated resolution time empathetically.
   d. If no outage exists, suggest device APN reset and Airplane mode toggle.
   e. Offer to raise a high-priority network ticket if issue persists.
4. For frustrated customers or when explicitly asked for a human representative, escalate immediately using the escalate_to_human tool.`;

    db.prepare(`
      INSERT INTO ai_configs (
        model, system_instructions, temperature, max_tokens, rag_top_k, rag_similarity_threshold, max_conversation_history, escalation_threshold, ai_enabled, updated_at
      ) VALUES (?, ?, 0.7, 1024, 5, 0.7, 20, 0.8, 1, ?)
    `).run('gpt-4o-mini', telecomSystemPrompt, now);

    db.prepare(`
      INSERT INTO ai_prompts (
        prompt_id, version, content, status, created_by, created_at
      ) VALUES (?, 1, ?, 'ACTIVE', 'admin@company.com', ?)
    `).run('prompt-telecom-v1', telecomSystemPrompt, now);
  });

  // 15. Generate Document Embeddings for RAG
  const allDocs = db.prepare('SELECT document_id, content FROM knowledge_documents').all() as Array<{ document_id: string; content: string }>;
  const insertEmbed = db.prepare(`
    INSERT INTO document_embeddings (document_id, chunk_index, chunk_text, embedding, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const doc of allDocs) {
    const embedding = await generateEmbedding(doc.content);
    insertEmbed.run(doc.document_id, 0, doc.content, JSON.stringify(embedding), now);
  }

  logger.info('Telecom database seeding complete! Demo subscribers, plans, usage, SIMs, and outages ready.');
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase(true).then(() => {
    logger.info('Seed script finished.');
    process.exit(0);
  }).catch((err) => {
    logger.error('Seed script failed:', err);
    process.exit(1);
  });
}
