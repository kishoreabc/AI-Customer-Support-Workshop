import { DatabaseSync } from 'node:sqlite';
import { logger } from '../utils/logger.js';

export function initializeSchema(db: DatabaseSync): void {
  logger.info('Initializing SQLite database schema...');

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

    -- Customer profiles with full contact, address and status info
    CREATE TABLE IF NOT EXISTS customer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id TEXT UNIQUE NOT NULL,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      date_of_birth TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      postal_code TEXT,
      customer_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(customer_status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
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

    -- Support agents for escalation and assignments
    CREATE TABLE IF NOT EXISTS support_agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT UNIQUE NOT NULL,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'SUPPORT_AGENT',
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
      department TEXT NOT NULL DEFAULT 'General Support',
      created_at TEXT NOT NULL,
      last_active_at TEXT
    );

    -- Product catalog with warranty, return policy, and specifications
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      availability_status TEXT NOT NULL DEFAULT 'IN_STOCK' CHECK(availability_status IN ('IN_STOCK', 'OUT_OF_STOCK', 'BACKORDER', 'DISCONTINUED')),
      specifications TEXT,
      warranty_information TEXT NOT NULL,
      return_policy TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Customer orders
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
      order_date TEXT NOT NULL,
      total_amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK(payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
      order_status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK(order_status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED')),
      shipping_address TEXT NOT NULL,
      estimated_delivery_date TEXT,
      tracking_number TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Order items
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_item_id TEXT UNIQUE NOT NULL,
      order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(product_id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
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
      category TEXT NOT NULL DEFAULT 'GENERAL',
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

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customer_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customer_profiles(email);
    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON support_tickets(customer_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_assigned_agent ON support_tickets(assigned_agent_id);
    CREATE INDEX IF NOT EXISTS idx_embeddings_doc ON document_embeddings(document_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
  `);

  logger.info('Database schema successfully initialized.');
}
