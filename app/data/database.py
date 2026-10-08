import sqlite3
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from app.config import settings

def get_db_path() -> str:
    path = Path(settings.DATABASE_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    return str(path)

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def query_get(sql: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        row = cursor.fetchone()
        return dict(row) if row else None

def query_all(sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

def execute(sql: str, params: tuple = ()) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        return cursor.rowcount

def init_db():
    db_path = get_db_path()
    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Users Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT CHECK(role IN ('CUSTOMER', 'SUPPORT_AGENT', 'ADMIN')) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 2. Customer Profiles (Subscribers)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS customer_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id TEXT UNIQUE NOT NULL,
            user_id TEXT UNIQUE NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT,
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
            customer_status TEXT DEFAULT 'ACTIVE',
            customer_since DATETIME DEFAULT CURRENT_TIMESTAMP,
            account_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login_at DATETIME,
            tags TEXT,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        );
        """)

        # 3. Telecom Tariff Plans
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS telecom_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            price REAL NOT NULL,
            currency TEXT DEFAULT 'INR',
            validity_days INTEGER NOT NULL,
            data_allowance TEXT NOT NULL,
            voice_allowance TEXT DEFAULT 'Unlimited Calls',
            sms_allowance TEXT DEFAULT '100 SMS/day',
            network_type TEXT DEFAULT '5G',
            is_5g INTEGER DEFAULT 1,
            roaming_available INTEGER DEFAULT 1,
            category TEXT DEFAULT 'UNLIMITED_5G',
            status TEXT DEFAULT 'ACTIVE',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 4. Subscriptions
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subscription_id TEXT UNIQUE NOT NULL,
            customer_id TEXT NOT NULL,
            plan_id TEXT NOT NULL,
            mobile_number TEXT NOT NULL,
            activation_date DATETIME NOT NULL,
            expiry_date DATETIME NOT NULL,
            status TEXT DEFAULT 'ACTIVE',
            auto_renew INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customer_profiles(customer_id),
            FOREIGN KEY (plan_id) REFERENCES telecom_plans(plan_id)
        );
        """)

        # 5. Real-Time Telecom Usage
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS telecom_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usage_id TEXT UNIQUE NOT NULL,
            customer_id TEXT NOT NULL,
            mobile_number TEXT NOT NULL,
            data_used_gb REAL DEFAULT 0.0,
            data_remaining_gb REAL DEFAULT 10.0,
            voice_used_mins INTEGER DEFAULT 0,
            voice_remaining_mins INTEGER DEFAULT -1,
            sms_used INTEGER DEFAULT 0,
            sms_remaining INTEGER DEFAULT 100,
            period_start DATETIME NOT NULL,
            period_end DATETIME NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customer_profiles(customer_id)
        );
        """)

        # 6. Recharges & Renewals
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS recharges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recharge_id TEXT UNIQUE NOT NULL,
            customer_id TEXT NOT NULL,
            mobile_number TEXT NOT NULL,
            plan_id TEXT NOT NULL,
            amount REAL NOT NULL,
            payment_method TEXT DEFAULT 'UPI',
            transaction_id TEXT NOT NULL,
            status TEXT DEFAULT 'SUCCESS',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customer_profiles(customer_id),
            FOREIGN KEY (plan_id) REFERENCES telecom_plans(plan_id)
        );
        """)

        # 7. Postpaid Bills
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_id TEXT UNIQUE NOT NULL,
            customer_id TEXT NOT NULL,
            mobile_number TEXT,
            billing_period TEXT,
            billing_period_start DATETIME,
            billing_period_end DATETIME,
            amount REAL NOT NULL,
            due_date TEXT NOT NULL,
            status TEXT DEFAULT 'PAID',
            breakdown_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customer_profiles(customer_id)
        );
        """)

        # 8. SIM & eSIM Cards
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sim_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sim_id TEXT UNIQUE NOT NULL,
            customer_id TEXT NOT NULL,
            mobile_number TEXT NOT NULL,
            sim_type TEXT DEFAULT 'PHYSICAL_SIM',
            iccid TEXT UNIQUE NOT NULL,
            imsi TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'ACTIVE',
            activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customer_profiles(customer_id)
        );
        """)

        # 9. Network Outages
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS network_outages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            outage_id TEXT UNIQUE NOT NULL,
            region TEXT NOT NULL,
            city TEXT NOT NULL,
            affected_service TEXT NOT NULL,
            network_type TEXT DEFAULT '5G',
            severity TEXT DEFAULT 'MAJOR',
            status TEXT DEFAULT 'INVESTIGATING',
            start_time DATETIME NOT NULL,
            estimated_resolution TEXT NOT NULL,
            description TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 10. Support Tickets
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS support_tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT UNIQUE NOT NULL,
            customer_id TEXT NOT NULL,
            conversation_id TEXT,
            subject TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT DEFAULT 'NETWORK',
            priority TEXT DEFAULT 'MEDIUM',
            status TEXT DEFAULT 'OPEN',
            assigned_agent_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customer_profiles(customer_id)
        );
        """)

        # 11. Conversations
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT UNIQUE NOT NULL,
            customer_id TEXT NOT NULL,
            status TEXT DEFAULT 'AI_ACTIVE',
            escalation_reason TEXT,
            channel TEXT DEFAULT 'WEB_CHAT',
            assigned_agent_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customer_profiles(customer_id)
        );
        """)

        # 12. Messages
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id TEXT UNIQUE NOT NULL,
            conversation_id TEXT NOT NULL,
            sender_type TEXT CHECK(sender_type IN ('CUSTOMER', 'AI', 'AGENT', 'SYSTEM')) NOT NULL,
            sender_id TEXT,
            content TEXT NOT NULL,
            tool_calls_json TEXT,
            tool_results_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
        );
        """)

        # 13. Knowledge Base
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS knowledge_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doc_id TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            content TEXT NOT NULL,
            tags TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 14. FAQs
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS faqs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            faq_id TEXT UNIQUE NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            category TEXT NOT NULL,
            tags TEXT,
            status TEXT DEFAULT 'PUBLISHED',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 15. Audit Logs
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            log_id TEXT UNIQUE NOT NULL,
            actor_id TEXT NOT NULL,
            actor_type TEXT NOT NULL,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            metadata TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 16. Tool Executions
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS tool_executions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            execution_id TEXT UNIQUE NOT NULL,
            conversation_id TEXT NOT NULL,
            tool_name TEXT NOT NULL,
            input TEXT,
            output TEXT,
            status TEXT NOT NULL,
            error TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        conn.commit()
