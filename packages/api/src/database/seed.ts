import bcrypt from 'bcryptjs';
import { getDatabase, runTransaction } from './connection.js';
import { initializeSchema } from './schema.js';
import { logger } from '../utils/logger.js';

export async function seedDatabase(): Promise<void> {
  const db = getDatabase();
  initializeSchema(db);

  logger.info('Checking if database already has seed data...');
  const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCountRow && userCountRow.count > 0) {
    logger.info('Database already seeded. Skipping.');
    return;
  }

  logger.info('Seeding fresh demo data...');

  const passwordHash = await bcrypt.hash('password123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const agentPasswordHash = await bcrypt.hash('agent123', 10);

  const now = new Date().toISOString();

  const insertUser = db.prepare(`
    INSERT INTO users (user_id, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertCustomer = db.prepare(`
    INSERT INTO customer_profiles (
      customer_id, user_id, first_name, last_name, email, phone, date_of_birth,
      address, city, state, country, postal_code, customer_status,
      account_created_at, notes, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAdmin = db.prepare(`
    INSERT INTO admin_users (admin_id, user_id, name, department, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertAgent = db.prepare(`
    INSERT INTO support_agents (agent_id, user_id, name, email, role, status, department, created_at, last_active_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProduct = db.prepare(`
    INSERT INTO products (
      product_id, name, sku, description, category, price, currency,
      stock_quantity, availability_status, specifications,
      warranty_information, return_policy, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      order_id, customer_id, order_date, total_amount, currency,
      payment_status, order_status, shipping_address, estimated_delivery_date,
      tracking_number, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (
      order_item_id, order_id, product_id, product_name, quantity, unit_price, total_price
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTicket = db.prepare(`
    INSERT INTO support_tickets (
      ticket_id, customer_id, conversation_id, subject, description, category,
      priority, status, assigned_agent_id, escalation_reason, internal_notes,
      created_at, updated_at, resolved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertKB = db.prepare(`
    INSERT INTO knowledge_documents (
      document_id, title, content, category, tags, source, status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertFAQ = db.prepare(`
    INSERT INTO faqs (
      faq_id, question, answer, category, tags, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPrompt = db.prepare(`
    INSERT INTO ai_prompts (
      prompt_id, version, content, status, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertConfig = db.prepare(`
    INSERT INTO ai_configs (
      model, system_instructions, temperature, max_tokens, rag_top_k,
      rag_similarity_threshold, max_conversation_history, escalation_threshold,
      ai_enabled, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (
      log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  runTransaction(db, () => {
    // 1. Admin
    insertUser.run('usr-admin-1', 'admin@company.com', adminPasswordHash, 'ADMIN', now);
    insertAdmin.run('adm-1', 'usr-admin-1', 'Alex Mercer (Admin)', 'Operations & IT', 'ACTIVE', now);

    // 2. Support Agent
    insertUser.run('usr-agent-1', 'sarah.agent@company.com', agentPasswordHash, 'SUPPORT_AGENT', now);
    insertAgent.run('agt-1', 'usr-agent-1', 'Sarah Jenkins', 'sarah.agent@company.com', 'SUPPORT_AGENT', 'ACTIVE', 'Technical Tier 2', now, now);

    // 3. Customer Alice
    insertUser.run('usr-cust-1', 'alice@example.com', passwordHash, 'CUSTOMER', now);
    insertCustomer.run(
      'cust-1',
      'usr-cust-1',
      'Alice',
      'Johnson',
      'alice@example.com',
      '+1 (555) 234-5678',
      '1992-04-15',
      '742 Evergreen Terrace',
      'Springfield',
      'OR',
      'USA',
      '97477',
      'ACTIVE',
      now,
      'High value tech enthusiast customer. Prefers email updates.',
      JSON.stringify(['VIP', 'Early Adopter'])
    );

    // 4. Customer Bob
    insertUser.run('usr-cust-2', 'bob@example.com', passwordHash, 'CUSTOMER', now);
    insertCustomer.run(
      'cust-2',
      'usr-cust-2',
      'Bob',
      'Smith',
      'bob@example.com',
      '+1 (555) 876-5432',
      '1988-11-20',
      '123 Maple Street',
      'Austin',
      'TX',
      'USA',
      '78701',
      'ACTIVE',
      now,
      'Standard customer account.',
      JSON.stringify(['Retail'])
    );

    // 5. Products
    insertProduct.run(
      'prod-101',
      'Apex Ultrabook 14 Pro',
      'APEX-NB-14P',
      'High performance 14-inch laptop with OLED display, 32GB RAM, 1TB NVMe SSD, and 12-core processor.',
      'Laptops',
      1299.99,
      'USD',
      42,
      'IN_STOCK',
      JSON.stringify({ display: '14" 2.8K 120Hz OLED', ram: '32GB LPDDR5X', storage: '1TB NVMe Gen4', weight: '1.25kg' }),
      'Includes 2-Year Limited Manufacturer Hardware Warranty covering screen defects, motherboard, and internal battery.',
      '30-Day Hassle-Free Returns. Full refund if unopened or returned with all original accessories in like-new condition.',
      now,
      now
    );

    insertProduct.run(
      'prod-102',
      'ProPulse Wireless ANC Headphones',
      'PROP-HP-ANC',
      'Premium over-ear wireless headphones with active noise cancellation, 40-hour battery life, and spatial audio.',
      'Audio',
      249.99,
      'USD',
      115,
      'IN_STOCK',
      JSON.stringify({ battery: '40 Hours ANC on', connectivity: 'Bluetooth 5.3 + 3.5mm AUX', codec: 'LDAC, AAC, SBC' }),
      '1-Year Manufacturer Replacement Warranty against driver distortion and battery degradation.',
      '30-Day Return Policy for sanitary unopened items or defective units.',
      now,
      now
    );

    insertProduct.run(
      'prod-103',
      'Titan Ergonomic Executive Chair',
      'TITAN-CH-01',
      'Full mesh ergonomic office chair with adjustable 4D armrests, dynamic lumbar support, and tilt lock.',
      'Furniture',
      450.00,
      'USD',
      28,
      'IN_STOCK',
      JSON.stringify({ material: 'Breathable KR-Mesh', maxWeight: '150kg / 330lbs', warrantyYears: 5 }),
      '5-Year Comprehensive Frame and Gas Lift Cylinder Warranty.',
      '14-Day In-Home Trial. Customer is responsible for disassembly and return shipping carton.',
      now,
      now
    );

    insertProduct.run(
      'prod-104',
      'Horizon 34" Curved UltraWide Gaming Monitor',
      'HOR-MON-34C',
      '34-inch 165Hz WQHD 3440x1440 curved IPS monitor with HDR400, USB-C 90W PD, and dual HDMI 2.1.',
      'Monitors',
      799.00,
      'USD',
      14,
      'IN_STOCK',
      JSON.stringify({ panel: 'Fast IPS Curved 1900R', refreshRate: '165Hz', colorGamut: '98% DCI-P3' }),
      '3-Year Zero-Bright-Pixel Warranty and rapid advance replacement.',
      '30-Day Return Policy with undamaged original foam packing.',
      now,
      now
    );

    insertProduct.run(
      'prod-105',
      'Quantum USB-C 10-in-1 Multiport Dock',
      'QNT-DOCK-10',
      'Aluminum hub supporting Dual 4K@60Hz HDMI, Gigabit Ethernet, 100W PD charging, SD/TF readers, and 3x USB 3.2.',
      'Accessories',
      89.50,
      'USD',
      195,
      'IN_STOCK',
      JSON.stringify({ ports: 'Dual HDMI 2.0, RJ45 1Gbps, 100W PD In, 3x USB-A 3.2, SD 4.0' }),
      '1-Year Standard Replacement Warranty.',
      '30-Day Return Policy.',
      now,
      now
    );

    // 6. Orders
    insertOrder.run(
      'ord-1001',
      'cust-1',
      new Date(Date.now() - 14 * 86400000).toISOString(),
      1299.99,
      'USD',
      'PAID',
      'DELIVERED',
      '742 Evergreen Terrace, Springfield, OR 97477',
      new Date(Date.now() - 10 * 86400000).toISOString(),
      'TRK-FEDEX-987261',
      now,
      now
    );
    insertOrderItem.run('item-101', 'ord-1001', 'prod-101', 'Apex Ultrabook 14 Pro', 1, 1299.99, 1299.99);

    insertOrder.run(
      'ord-1002',
      'cust-1',
      new Date(Date.now() - 2 * 86400000).toISOString(),
      339.49,
      'USD',
      'PAID',
      'OUT_FOR_DELIVERY',
      '742 Evergreen Terrace, Springfield, OR 97477',
      new Date(Date.now() + 1 * 86400000).toISOString(),
      'TRK-UPS-443219',
      now,
      now
    );
    insertOrderItem.run('item-102', 'ord-1002', 'prod-102', 'ProPulse Wireless ANC Headphones', 1, 249.99, 249.99);
    insertOrderItem.run('item-103', 'ord-1002', 'prod-105', 'Quantum USB-C 10-in-1 Multiport Dock', 1, 89.50, 89.50);

    insertOrder.run(
      'ord-1003',
      'cust-2',
      new Date(Date.now() - 1 * 86400000).toISOString(),
      450.00,
      'USD',
      'PAID',
      'PROCESSING',
      '123 Maple Street, Austin, TX 78701',
      new Date(Date.now() + 4 * 86400000).toISOString(),
      'TRK-PENDING-ASSIGN',
      now,
      now
    );
    insertOrderItem.run('item-104', 'ord-1003', 'prod-103', 'Titan Ergonomic Executive Chair', 1, 450.00, 450.00);

    // 7. Support Tickets
    insertTicket.run(
      'tik-201',
      'cust-1',
      null,
      'Ultrabook multi-monitor dock setup assistance',
      'Customer wanted to verify if Quantum USB-C Dock supports dual displays with the Apex Ultrabook.',
      'PRODUCT_INQUIRY',
      'LOW',
      'RESOLVED',
      'agt-1',
      null,
      'Provided connection diagram. Customer confirmed dual 4K monitors worked via Thunderbolt.',
      new Date(Date.now() - 7 * 86400000).toISOString(),
      new Date(Date.now() - 6 * 86400000).toISOString(),
      new Date(Date.now() - 6 * 86400000).toISOString()
    );

    insertTicket.run(
      'tik-202',
      'cust-1',
      null,
      'Package delivery time inquiry for ORD-1002',
      'Customer requested delivery time window estimation for today.',
      'SHIPPING',
      'MEDIUM',
      'OPEN',
      'agt-1',
      'Customer requested real-time human agent confirmation of courier window',
      'Courier scheduled delivery between 2:00 PM and 5:30 PM PST.',
      new Date(Date.now() - 4 * 3600000).toISOString(),
      now,
      null
    );

    // 8. Knowledge Documents
    insertKB.run(
      'doc-kb-1',
      'Global Returns & Refund Policy',
      `Our goal is 100% customer satisfaction.
1. Eligibility: Products can be returned within 30 days of confirmed delivery date.
2. Condition: Items must include original packaging, manuals, accessories, and be free of accidental physical damage.
3. Process: Customers initiate a return via the customer portal or support agent. A pre-paid printable return shipping label will be generated.
4. Refunds: Once the returned item is inspected at our fulfillment center (usually within 48 hours of receipt), the refund is processed back to the original payment method within 3-5 business days.
5. Exceptions: Opened consumable items, software licenses, or customized items cannot be refunded unless defective upon arrival.`,
      'Policies',
      JSON.stringify(['return', 'refund', 'policy', 'money back']),
      'MANUAL',
      'PUBLISHED',
      'Alex Mercer',
      now,
      now
    );

    insertKB.run(
      'doc-kb-2',
      'Warranty Coverage & Repair Procedures',
      `All hardware products sold include standard manufacturer warranty coverage:
1. Warranty Periods:
   - Apex Laptops: 2-Year Limited Hardware Warranty.
   - ProPulse Audio: 1-Year Limited Replacement Warranty.
   - Titan Chairs: 5-Year Structural Frame & Cylinder Warranty.
   - Horizon Displays: 3-Year Zero-Bright-Pixel Warranty.
   - Accessories & Docks: 1-Year Standard Warranty.
2. What is covered: Manufacturing defects, premature battery degradation (under 80% capacity within 12 months), display dead pixels, motherboard hardware failure.
3. What is NOT covered: Water damage, cracked screens from drops, unauthorized third-party repairs.
4. Repair turnaround: Average turnaround time is 5 business days after receiving the device at our regional service center.`,
      'Warranty',
      JSON.stringify(['warranty', 'repair', 'hardware', 'broken', 'defect']),
      'MANUAL',
      'PUBLISHED',
      'Alex Mercer',
      now,
      now
    );

    insertKB.run(
      'doc-kb-3',
      'Shipping, Delivery & Tracking Guidelines',
      `Information regarding our logistics and carrier partners:
1. Carriers: Orders are dispatched via FedEx, UPS, or DHL Express depending on destination and package dimensions.
2. Delivery Tiers:
   - Standard Ground: 3 to 5 business days. Free on orders over $50.
   - Expedited 2-Day: 2 business days guaranteed. $15 flat rate.
   - Next-Day Priority: Next business day delivery if ordered before 2:00 PM EST.
3. Tracking: Tracking numbers are automatically attached to the order within 24 hours of dispatch. Customers can view real-time tracking numbers directly in 'My Orders' or ask the AI agent.
4. Address Changes: Address updates can only be made while the order status is 'CONFIRMED' or 'PROCESSING'. Once marked 'SHIPPED', reroutes must be requested directly with the carrier or escalated to a human agent.`,
      'Shipping',
      JSON.stringify(['shipping', 'delivery', 'tracking', 'fedex', 'ups', 'carrier']),
      'MANUAL',
      'PUBLISHED',
      'Alex Mercer',
      now,
      now
    );

    insertKB.run(
      'doc-kb-4',
      'Apex Ultrabook 14 Pro Troubleshooting & Dock Setup',
      `Quick troubleshooting steps for common technical inquiries:
1. External Displays Not Detected:
   - Ensure you are connecting via the Thunderbolt 4 port on the left side of the Apex Ultrabook.
   - Update graphics drivers from the preinstalled Support Center app or AMD/Intel software.
   - If using the Quantum 10-in-1 Dock, connect the 100W PD power adapter directly to the dock's PD-IN port.
2. Battery Not Charging:
   - Check that the USB-C charger is delivering at least 65W.
   - Perform an EC (Embedded Controller) reset: Turn off laptop, hold the Power button for 20 seconds, release, then turn back on.
3. Audio Troubleshooting:
   - Toggle audio output device in the system tray. If using ProPulse headphones via Bluetooth, confirm AAC codec support is enabled in device settings.`,
      'Troubleshooting',
      JSON.stringify(['laptop', 'troubleshooting', 'dock', 'display', 'battery', 'charge']),
      'MANUAL',
      'PUBLISHED',
      'Alex Mercer',
      now,
      now
    );

    // 9. FAQs
    insertFAQ.run(
      'faq-1',
      'How do I return an item and get a refund?',
      'You can return any physical product within 30 days of delivery. Make sure the item is in like-new condition with all original packaging and accessories. Contact support or use our automated portal to generate a prepaid shipping label. Refunds are processed within 3-5 business days after inspection.',
      'Returns & Refunds',
      JSON.stringify(['return', 'refund', '30 days']),
      'PUBLISHED',
      now,
      now
    );

    insertFAQ.run(
      'faq-2',
      'How can I track my package?',
      'Navigate to "My Orders" in your customer dashboard, or ask our AI Support Agent "Where is my order?". You will find your tracking number and current transit status immediately.',
      'Shipping',
      JSON.stringify(['track', 'shipping', 'order status']),
      'PUBLISHED',
      now,
      now
    );

    insertFAQ.run(
      'faq-3',
      'What warranty comes with my purchase?',
      'Laptops feature a 2-year warranty, audio products 1-year, monitors 3-year with zero bright pixel guarantee, chairs 5-year frame warranty, and accessories 1-year. Warranty covers manufacturing and hardware defects.',
      'Warranty',
      JSON.stringify(['warranty', 'guarantee', 'repair']),
      'PUBLISHED',
      now,
      now
    );

    insertFAQ.run(
      'faq-4',
      'Can I speak with a human support agent?',
      'Yes, absolutely! At any point during your conversation, you can ask for a human representative or click "Request Human Support". Our system will immediately escalate your issue and notify an available support specialist.',
      'Support',
      JSON.stringify(['human', 'agent', 'representative', 'escalate']),
      'PUBLISHED',
      now,
      now
    );

    insertFAQ.run(
      'faq-5',
      'Can I change my delivery address after placing an order?',
      'If your order is in PENDING or PROCESSING status, an agent or admin can update the shipping address for you. Once an order is SHIPPED, please request a carrier hold or ask an agent to submit a carrier intercept.',
      'Orders',
      JSON.stringify(['address', 'change order', 'delivery']),
      'PUBLISHED',
      now,
      now
    );

    // 10. AI System Prompt
    const systemPromptContent = `You are the official AI Customer Support Specialist for our technology and hardware store.
Your goal is to provide exceptional, polite, accurate, and efficient support to customers.

CORE RULES:
1. ONLY access and discuss data for the current authenticated customer. Never disclose information about other customers.
2. ALWAYS use your provided tools to look up customer orders, product specs, warranty details, knowledge base articles, or support tickets.
3. NEVER fabricate or hallucinate order numbers, tracking numbers, refund amounts, or policy terms. If you don't know or cannot verify, clearly state so.
4. SEARCH FAQs AND KNOWLEDGE BASE first before providing company policy answers (returns, shipping, warranties).
5. If a customer expresses strong frustration, dissatisfaction, or repeatedly faces issues, empathetically acknowledge their feelings and offer to escalate to a human agent using the escalate_to_human tool.
6. If the customer explicitly requests a human agent or representative, IMMEDIATELY call the escalate_to_human tool.
7. If an action requires human review (such as approving an exceptional refund or changing an in-transit order address), create a support ticket and inform the customer that a human agent will assist them.
8. Maintain a professional, concise, empathetic, and reassuring tone.`;

    insertPrompt.run('prompt-v1', 1, systemPromptContent, 'ACTIVE', 'Alex Mercer', now);

    // 11. AI Runtime Config
    insertConfig.run(
      'gpt-4o-mini',
      systemPromptContent,
      0.7,
      1024,
      5,
      0.7,
      20,
      0.8,
      1,
      now
    );

    // 12. Audit Logs
    insertAudit.run('log-1', 'usr-admin-1', 'ADMIN', 'SEED_DATABASE', 'SYSTEM', 'all', JSON.stringify({ note: 'Initial setup completed' }), now);
  });

  logger.info('Database seeding completed successfully.');
}

// Allow running directly via tsx
if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase()
    .then(() => {
      logger.info('Seed script finished.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Seed script failed:', { error: String(err) });
      process.exit(1);
    });
}
