import { DatabaseSync } from 'node:sqlite';
import { logger } from '../utils/logger.js';

export function initializeSchema(db: DatabaseSync): void {
  logger.info('Initializing Telecom SQLite database schema...');

  db.exec(`
    -- Users table for unified authentication credentials
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'SUPPORT_AGENT', 'CUSTOMER')),
      created_at TEXT NOT NULL
    );

    -- Customer/Subscriber profiles with mobile numbers and telecom details
    CREATE TABLE IF NOT EXISTS customer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id TEXT UNIQUE NOT NULL,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      phone_number TEXT,
      alternate_number TEXT,
      date_of_birth TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      country TEXT DEFAULT 'India',
      postal_code TEXT,
      pincode TEXT,
      customer_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(customer_status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
      customer_since TEXT,
      account_created_at TEXT NOT NULL,
      last_login_at TEXT,
      notes TEXT,
      tags TEXT
    );

    -- Admin user metadata
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id TEXT UNIQUE NOT NULL,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      department TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL
    );

    -- Support agents for telecom escalation and ticket assignments
    CREATE TABLE IF NOT EXISTS support_agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT UNIQUE NOT NULL,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'SUPPORT_AGENT',
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
      department TEXT NOT NULL DEFAULT 'Telecom Network & Billing Desk',
      created_at TEXT NOT NULL,
      last_active_at TEXT
    );

    -- Telecom Plans Catalog (Prepaid, Postpaid, 5G, Unlimited, Roaming)
    CREATE TABLE IF NOT EXISTS telecom_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      validity_days INTEGER NOT NULL,
      data_allowance TEXT NOT NULL,
      voice_allowance TEXT NOT NULL DEFAULT 'Unlimited Calls',
      sms_allowance TEXT NOT NULL DEFAULT '100 SMS/day',
      network_type TEXT NOT NULL DEFAULT '5G' CHECK(network_type IN ('4G', '5G', 'FIBER')),
      is_5g INTEGER NOT NULL DEFAULT 1,
      roaming_available INTEGER NOT NULL DEFAULT 1,
      category TEXT NOT NULL DEFAULT 'UNLIMITED',
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Active Subscriptions
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES telecom_plans(plan_id),
      mobile_number TEXT NOT NULL,
      activation_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'QUEUED')),
      auto_renew INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Subscriber Live Usage (Data, Voice, SMS)
    CREATE TABLE IF NOT EXISTS telecom_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usage_id TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
      mobile_number TEXT NOT NULL,
      data_used_gb REAL NOT NULL DEFAULT 0.0,
      data_remaining_gb REAL NOT NULL DEFAULT 0.0,
      voice_used_mins INTEGER NOT NULL DEFAULT 0,
      voice_remaining_mins INTEGER NOT NULL DEFAULT -1,
      sms_used INTEGER NOT NULL DEFAULT 0,
      sms_remaining INTEGER NOT NULL DEFAULT 100,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Recharges (Transaction history)
    CREATE TABLE IF NOT EXISTS recharges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recharge_id TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
      mobile_number TEXT NOT NULL,
      plan_id TEXT REFERENCES telecom_plans(plan_id),
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_id TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK(status IN ('SUCCESS', 'PENDING', 'FAILED', 'REFUNDED')),
      created_at TEXT NOT NULL
    );

    -- Postpaid Bills
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
      mobile_number TEXT NOT NULL,
      billing_period TEXT NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(status IN ('PAID', 'UNPAID', 'OVERDUE')),
      breakdown_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Payments for Bills & Recharges
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id TEXT UNIQUE NOT NULL,
      bill_id TEXT REFERENCES bills(bill_id),
      recharge_id TEXT REFERENCES recharges(recharge_id),
      customer_id TEXT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      transaction_date TEXT NOT NULL
    );

    -- SIM Cards & eSIM Profiles
    CREATE TABLE IF NOT EXISTS sim_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sim_id TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
      mobile_number TEXT NOT NULL,
      sim_type TEXT NOT NULL DEFAULT 'PHYSICAL' CHECK(sim_type IN ('PHYSICAL', 'ESIM')),
      iccid TEXT UNIQUE NOT NULL,
      imsi TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING_ACTIVATION')),
      activated_at TEXT NOT NULL
    );

    -- Network Outages (Regional incidents)
    CREATE TABLE IF NOT EXISTS network_outages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      outage_id TEXT UNIQUE NOT NULL,
      region TEXT NOT NULL,
      city TEXT NOT NULL,
      affected_service TEXT NOT NULL,
      network_type TEXT NOT NULL DEFAULT '5G',
      severity TEXT NOT NULL DEFAULT 'MAJOR' CHECK(severity IN ('MINOR', 'MAJOR', 'CRITICAL')),
      status TEXT NOT NULL DEFAULT 'INVESTIGATING' CHECK(status IN ('INVESTIGATING', 'IDENTIFIED', 'IN_PROGRESS', 'RESOLVED')),
      start_time TEXT NOT NULL,
      estimated_resolution TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Reported Network Issues by subscribers
    CREATE TABLE IF NOT EXISTS network_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
      mobile_number TEXT NOT NULL,
      issue_type TEXT NOT NULL CHECK(issue_type IN ('SLOW_DATA', 'NO_SIGNAL', 'CALL_DROPS', 'SMS_FAILURE', '5G_INACCESSIBLE')),
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'INVESTIGATING', 'RESOLVED')),
      reported_at TEXT NOT NULL,
      resolved_at TEXT
    );

    -- Support conversations
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
      assigned_agent_id TEXT REFERENCES support_agents(agent_id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'AI_ACTIVE' CHECK(status IN ('OPEN', 'AI_ACTIVE', 'WAITING_FOR_CUSTOMER', 'ESCALATED', 'HUMAN_HANDOFF', 'RESOLVED', 'CLOSED')),
      escalation_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT
    );

    -- Messages in conversations
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT UNIQUE NOT NULL,
      conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
      sender_type TEXT NOT NULL CHECK(sender_type IN ('CUSTOMER', 'AI', 'HUMAN_AGENT', 'SYSTEM')),
      content TEXT NOT NULL,
      tool_call_id TEXT,
      metadata TEXT,
      timestamp TEXT NOT NULL
    );

    -- Support tickets
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
      conversation_id TEXT REFERENCES conversations(conversation_id) ON DELETE SET NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'NETWORK' CHECK(category IN ('NETWORK', 'BILLING', 'RECHARGE', 'SIM', 'PLAN', 'ROAMING', 'GENERAL')),
      priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED')),
      assigned_agent_id TEXT REFERENCES support_agents(agent_id) ON DELETE SET NULL,
      escalation_reason TEXT,
      internal_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT
    );

    -- Knowledge base documents
    CREATE TABLE IF NOT EXISTS knowledge_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT,
      source TEXT NOT NULL DEFAULT 'MANUAL',
      status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK(status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Frequently Asked Questions
    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      faq_id TEXT UNIQUE NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT,
      status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK(status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- AI Tool execution audit logs
    CREATE TABLE IF NOT EXISTS tool_executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      execution_id TEXT UNIQUE NOT NULL,
      conversation_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      input TEXT NOT NULL,
      output TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'ERROR')),
      error TEXT,
      timestamp TEXT NOT NULL
    );

    -- AI system prompt versions
    CREATE TABLE IF NOT EXISTS ai_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id TEXT UNIQUE NOT NULL,
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'ARCHIVED')),
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Audit logs for compliance and tracing
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_id TEXT UNIQUE NOT NULL,
      actor_id TEXT NOT NULL,
      actor_type TEXT NOT NULL CHECK(actor_type IN ('CUSTOMER', 'SUPPORT_AGENT', 'ADMIN', 'AI', 'SYSTEM')),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      metadata TEXT,
      timestamp TEXT NOT NULL
    );

    -- Embeddings store for RAG
    CREATE TABLE IF NOT EXISTS document_embeddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id TEXT NOT NULL REFERENCES knowledge_documents(document_id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      chunk_text TEXT NOT NULL,
      embedding TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- AI runtime configuration
    CREATE TABLE IF NOT EXISTS ai_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      system_instructions TEXT NOT NULL,
      temperature REAL NOT NULL DEFAULT 0.7,
      max_tokens INTEGER NOT NULL DEFAULT 1024,
      rag_top_k INTEGER NOT NULL DEFAULT 5,
      rag_similarity_threshold REAL NOT NULL DEFAULT 0.7,
      max_conversation_history INTEGER NOT NULL DEFAULT 20,
      escalation_threshold REAL NOT NULL DEFAULT 0.8,
      ai_enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    -- Legacy/Compatibility tables so existing generic references still resolve seamlessly
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      availability_status TEXT NOT NULL DEFAULT 'IN_STOCK',
      specifications TEXT,
      warranty_information TEXT NOT NULL,
      return_policy TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
      order_date TEXT NOT NULL,
      total_amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      payment_status TEXT NOT NULL DEFAULT 'PAID',
      order_status TEXT NOT NULL DEFAULT 'CONFIRMED',
      shipping_address TEXT NOT NULL,
      estimated_delivery_date TEXT,
      tracking_number TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_item_id TEXT UNIQUE NOT NULL,
      order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customer_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customer_profiles(phone_number);
    CREATE INDEX IF NOT EXISTS idx_plans_status ON telecom_plans(status);
    CREATE INDEX IF NOT EXISTS idx_subs_customer_id ON subscriptions(customer_id);
    CREATE INDEX IF NOT EXISTS idx_subs_phone ON subscriptions(mobile_number);
    CREATE INDEX IF NOT EXISTS idx_usage_customer_id ON telecom_usage(customer_id);
    CREATE INDEX IF NOT EXISTS idx_recharges_customer_id ON recharges(customer_id);
    CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON bills(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sims_customer_id ON sim_cards(customer_id);
    CREATE INDEX IF NOT EXISTS idx_outages_city ON network_outages(city);
    CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON support_tickets(customer_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_assigned_agent ON support_tickets(assigned_agent_id);
    CREATE INDEX IF NOT EXISTS idx_embeddings_doc ON document_embeddings(document_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
  `);

  logger.info('Telecom database schema successfully initialized.');
}
