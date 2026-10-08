import json
from datetime import datetime, timezone, timedelta
import bcrypt
from app.data.database import get_connection, query_get

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode('utf-8')[:72], bcrypt.gensalt(10)).decode('utf-8')

def seed_database(force: bool = False):
    with get_connection() as conn:
        cursor = conn.cursor()

        # Check if already seeded
        existing_user = cursor.execute("SELECT id FROM users LIMIT 1").fetchone()
        if existing_user and not force:
            return

        now = datetime.now(timezone.utc).isoformat()
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        future_date = (datetime.now(timezone.utc) + timedelta(days=45)).isoformat()

        customer_hash = hash_pw("password123")
        admin_hash = hash_pw("admin123")
        agent_hash = hash_pw("agent123")

        # 1. Clean existing records in reverse dependency order
        cursor.execute("PRAGMA foreign_keys = OFF;")
        cursor.execute("DELETE FROM messages")
        cursor.execute("DELETE FROM conversations")
        cursor.execute("DELETE FROM support_tickets")
        cursor.execute("DELETE FROM subscriptions")
        cursor.execute("DELETE FROM telecom_usage")
        cursor.execute("DELETE FROM recharges")
        cursor.execute("DELETE FROM bills")
        cursor.execute("DELETE FROM sim_cards")
        cursor.execute("DELETE FROM network_outages")
        cursor.execute("DELETE FROM knowledge_documents")
        cursor.execute("DELETE FROM faqs")
        cursor.execute("DELETE FROM telecom_plans")
        cursor.execute("DELETE FROM customer_profiles")
        cursor.execute("DELETE FROM users")
        cursor.execute("PRAGMA foreign_keys = ON;")

        users_data = [
            ('usr-admin-1', 'admin@company.com', admin_hash, 'ADMIN', now),
            ('usr-agent-1', 'sarah@company.com', agent_hash, 'SUPPORT_AGENT', now),
            ('usr-cust-1', 'alice@example.com', customer_hash, 'CUSTOMER', now),
            ('usr-cust-2', 'bob@example.com', customer_hash, 'CUSTOMER', now),
        ]
        cursor.executemany(
            "INSERT INTO users (user_id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
            users_data
        )

        # 2. Customer Profiles
        customers_data = [
            (
                'cust-1', 'usr-cust-1', 'Alice', 'Sharma', 'alice@example.com',
                '+91 98765 43210', '+91 98765 43210', '+91 98765 00000', '1992-04-12',
                'Flat 402, High-Tech Tower, Bandra West', 'Mumbai', 'Maharashtra', 'India',
                '400050', '400050', 'ACTIVE', now, now, json.dumps(['5G Subscriber', 'High ARPU', 'VIP'])
            ),
            (
                'cust-2', 'usr-cust-2', 'Bob', 'Verma', 'bob@example.com',
                '+91 91234 56789', '+91 91234 56789', None, '1988-11-20',
                'Plot 18, Anna Nagar 2nd Avenue', 'Chennai', 'Tamil Nadu', 'India',
                '600040', '600040', 'ACTIVE', now, now, json.dumps(['Standard 4G/5G', 'Prepaid'])
            ),
        ]
        cursor.executemany("""
            INSERT INTO customer_profiles (
                customer_id, user_id, first_name, last_name, email,
                phone, phone_number, alternate_number, date_of_birth,
                address, city, state, country, postal_code, pincode,
                customer_status, customer_since, account_created_at, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, customers_data)

        # 3. Telecom Tariff Plans
        plans_data = [
            (
                'plan-5g-799', 'Unlimited 5G 799',
                'True 5G Unlimited Data with 2GB/day 4G fallback, unlimited domestic voice, and 100 SMS/day.',
                799.0, 'INR', 56, '2GB/day + Unlimited True 5G', 'Unlimited national calling',
                '100 SMS/day', '5G', 1, 1, 'UNLIMITED_5G', 'ACTIVE', now, now
            ),
            (
                'plan-prep-349', 'Super 5G 349',
                'High-speed 2.5GB/day 5G data allowance, unlimited local & STD calls, 100 SMS/day.',
                349.0, 'INR', 28, '2.5GB/day High Speed', 'Unlimited national calling',
                '100 SMS/day', '5G', 1, 0, 'POPULAR_MONTHLY', 'ACTIVE', now, now
            ),
            (
                'plan-booster-49', 'Data Booster 49',
                'Instant 6GB high-speed 5G/4G data add-on with validity tied to existing active base pack.',
                49.0, 'INR', 1, '6GB Instant High Speed Data', 'No voice quota',
                'No SMS quota', '5G', 1, 0, 'DATA_BOOSTER', 'ACTIVE', now, now
            ),
            (
                'plan-annual-2999', 'Yearly Unlimited 2999',
                '365 days validity, 2.5GB daily high-speed quota, unlimited 5G True Core, and free national roaming.',
                2999.0, 'INR', 365, '2.5GB/day + Unlimited 5G', 'Unlimited national calling',
                '100 SMS/day', '5G', 1, 1, 'ANNUAL_PLAN', 'ACTIVE', now, now
            ),
            (
                'plan-roam-1499', 'Global Travel Roaming 1499',
                'International roaming pack for USA, UK, UAE, Europe, and Asia. 5GB data, 100 mins calling.',
                1499.0, 'INR', 14, '5GB International Data', '100 Mins International Roaming Voice',
                '50 International SMS', '5G', 1, 1, 'ROAMING_PACK', 'ACTIVE', now, now
            ),
            (
                'plan-basic-199', 'Value Pack 199',
                'Basic voice and data plan: 1.5GB total data, 300 minutes voice, 28 days validity.',
                199.0, 'INR', 28, '1.5GB Total Data', '300 Mins Voice',
                '100 SMS total', '4G', 0, 0, 'POPULAR_MONTHLY', 'ACTIVE', now, now
            ),
        ]
        cursor.executemany("""
            INSERT INTO telecom_plans (
                plan_id, name, description, price, currency, validity_days,
                data_allowance, voice_allowance, sms_allowance, network_type,
                is_5g, roaming_available, category, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, plans_data)

        # 4. Subscriptions
        subscriptions_data = [
            ('sub-1001', 'cust-1', 'plan-5g-799', '+91 98765 43210', yesterday, future_date, 'ACTIVE', 1, now, now),
            ('sub-1002', 'cust-2', 'plan-prep-349', '+91 91234 56789', yesterday, future_date, 'ACTIVE', 1, now, now),
        ]
        cursor.executemany("""
            INSERT INTO subscriptions (
                subscription_id, customer_id, plan_id, mobile_number,
                activation_date, expiry_date, status, auto_renew, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, subscriptions_data)

        # 5. Usage
        usage_data = [
            (
                'usg-1001', 'cust-1', '+91 98765 43210', 2.6, 7.4, 340, -1, 12, 88,
                yesterday, future_date, now
            ),
            (
                'usg-1002', 'cust-2', '+91 91234 56789', 9.8, 0.2, 180, -1, 45, 55,
                yesterday, future_date, now
            ),
        ]
        cursor.executemany("""
            INSERT INTO telecom_usage (
                usage_id, customer_id, mobile_number, data_used_gb, data_remaining_gb,
                voice_used_mins, voice_remaining_mins, sms_used, sms_remaining,
                period_start, period_end, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, usage_data)

        # 6. Recharges
        recharges_data = [
            ('rch-2001', 'cust-1', '+91 98765 43210', 'plan-5g-799', 799.0, 'UPI', 'TXN-UPI-98761234', 'SUCCESS', yesterday),
            ('rch-2002', 'cust-1', '+91 98765 43210', 'plan-booster-49', 49.0, 'UPI', 'TXN-UPI-98765678', 'SUCCESS', now),
            ('rch-2003', 'cust-2', '+91 91234 56789', 'plan-prep-349', 349.0, 'CREDIT_CARD', 'TXN-CC-12344321', 'SUCCESS', yesterday),
        ]
        cursor.executemany("""
            INSERT INTO recharges (
                recharge_id, customer_id, mobile_number, plan_id, amount,
                payment_method, transaction_id, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, recharges_data)

        # 7. Bills
        bills_data = [
            (
                'bill-3001', 'cust-1', '+91 98765 43210', 'Sep 2026', yesterday, future_date,
                799.0, '2026-10-15', 'PAID',
                json.dumps({'planCharges': 677.12, 'gst18Percent': 121.88, 'discount': 0, 'total': 799}),
                yesterday
            ),
            (
                'bill-3002', 'cust-2', '+91 91234 56789', 'Sep 2026', yesterday, future_date,
                349.0, '2026-10-18', 'UNPAID',
                json.dumps({'planCharges': 295.76, 'gst18Percent': 53.24, 'discount': 0, 'total': 349}),
                yesterday
            ),
        ]
        cursor.executemany("""
            INSERT INTO bills (
                bill_id, customer_id, mobile_number, billing_period, billing_period_start,
                billing_period_end, amount, due_date, status, breakdown_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, bills_data)

        # 8. SIM Cards
        sims_data = [
            ('sim-4001', 'cust-1', '+91 98765 43210', 'ESIM', '89910012345678901234', '404450123456789', 'ACTIVE', '2022-01-15T12:00:00Z'),
            ('sim-4002', 'cust-2', '+91 91234 56789', 'PHYSICAL_SIM', '89910098765432109876', '404450987654321', 'ACTIVE', '2023-05-10T12:00:00Z'),
        ]
        cursor.executemany("""
            INSERT INTO sim_cards (
                sim_id, customer_id, mobile_number, sim_type, iccid, imsi, status, activated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, sims_data)

        # 9. Network Outages
        outages_data = [
            (
                'OUT-2026-CH01', 'Tamil Nadu', 'Chennai', '5G Mobile Data & High-Speed Internet',
                '5G', 'MAJOR', 'IN_PROGRESS', yesterday, 'Today, 8:00 PM IST',
                'Subsea cable landing station optical fiber cut near Guindy substation causing packet loss and degraded 5G mobile broadband speeds across Chennai south.',
                now, now
            ),
            (
                'OUT-2026-PU02', 'Maharashtra', 'Pune', 'VoLTE Voice Calling',
                '4G', 'MINOR', 'INVESTIGATING', yesterday, 'Today, 6:00 PM IST',
                'Scheduled cell tower maintenance at Hinjewadi Phase 3. Voice calls may momentarily fall back to 3G/2G.',
                now, now
            ),
        ]
        cursor.executemany("""
            INSERT INTO network_outages (
                outage_id, region, city, affected_service, network_type, severity,
                status, start_time, estimated_resolution, description, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, outages_data)

        # 10. Support Tickets
        tickets_data = [
            (
                'TCK-101', 'cust-2', None, 'Slow 5G speed in Chennai south',
                'Experiencing 1-2 Mbps data speeds instead of usual 600 Mbps on 5G network.',
                'NETWORK', 'HIGH', 'IN_PROGRESS', 'usr-agent-1', yesterday, now
            ),
            (
                'TCK-102', 'cust-1', None, 'eSIM activation query for secondary device',
                'Needed setup code for new iPad cellular configuration.',
                'SIM', 'LOW', 'RESOLVED', 'usr-agent-1', yesterday, now
            ),
        ]
        cursor.executemany("""
            INSERT INTO support_tickets (
                ticket_id, customer_id, conversation_id, subject, description,
                category, priority, status, assigned_agent_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, tickets_data)

        # 11. Knowledge Documents
        docs_data = [
            (
                'doc-1', '5G Standalone (SA) Configuration Guide', 'Network',
                'To activate 5G Standalone on iOS and Android: Ensure 5G Auto or 5G On is selected in Cellular Data Options. Set APN to telecom.5g.net with MCC 404, MNC 45. VoLTE and VoWiFi must remain enabled for seamless HD calling.',
                '5g, apn, standalone, ios, android, volte, vowifi', now
            ),
            (
                'doc-2', 'Digital eSIM Instant Activation Workflow', 'SIM',
                'Customers can convert from physical SIM to digital eSIM inside the TelecomOne portal or by sending SMS ESIM <email> to 199. An SM-DP+ QR activation string is issued instantly. Keep Wi-Fi active while downloading the cellular profile.',
                'esim, qr, activation, smdp, profile, convert', now
            ),
            (
                'doc-3', 'Fair Usage Policy (FUP) & Data Booster Packs', 'Plans',
                'Unlimited 5G plans feature uncapped high-speed data under True 5G network coverage. When connected to 4G LTE fallback, daily limits apply as per plan terms. Additional data can be added anytime with ₹49 6GB data booster.',
                'fup, fair usage, data booster, speed limit, 4g fallback', now
            ),
            (
                'doc-4', 'International Roaming & Airport Activation', 'Roaming',
                'International roaming packs activate automatically upon landing at destination country. Ensure Data Roaming is toggled ON in phone settings. In-flight and maritime roaming require separate global passes.',
                'roaming, international, travel, flight, abroad', now
            ),
        ]
        cursor.executemany("""
            INSERT INTO knowledge_documents (
                doc_id, title, category, content, tags, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, docs_data)

        # 12. FAQs
        faqs_data = [
            (
                'faq-1', 'Why is my 5G internet running slow?',
                'Slow data can occur if: 1) You are in an area experiencing temporary cell tower maintenance or outage, 2) Daily high-speed data quota is exhausted, or 3) Device network mode is locked to 4G LTE. Check network status or toggle Airplane mode.',
                'Network', 'slow data, internet, 5g speed, outage', 'PUBLISHED', now
            ),
            (
                'faq-2', 'How do I convert my physical SIM into an eSIM?',
                'Open My SIM in the subscriber portal and click "Upgrade to Instant eSIM". You will receive an instant QR code and LPA activation token to scan under Settings -> Cellular -> Add eSIM.',
                'SIM', 'esim, convert, qr code, activate', 'PUBLISHED', now
            ),
            (
                'faq-3', 'What is the APN setting for 5G internet?',
                'The default Access Point Name (APN) is "telecom.5g.net". APN Type: default,supl. Authentication: None. Bearer: Unspecified / 5G.',
                'Network', 'apn, settings, access point, config', 'PUBLISHED', now
            ),
            (
                'faq-4', 'How do I check my remaining 5G data balance?',
                'You can view real-time data consumption directly on the My Usage dashboard or ask this AI assistant "How much data do I have left?".',
                'Usage', 'data balance, remaining data, usage', 'PUBLISHED', now
            ),
        ]
        cursor.executemany("""
            INSERT INTO faqs (
                faq_id, question, answer, category, tags, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, faqs_data)

        conn.commit()
