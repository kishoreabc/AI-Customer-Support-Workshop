import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from app.data.database import query_get, query_all, execute
from app.agent.rag import search_knowledge_base, search_faqs

def execute_tool(
    tool_name: str,
    args: Dict[str, Any],
    context: Dict[str, Any]
) -> Dict[str, Any]:
    customer_id = context.get("customerId") or context.get("customer_id")
    user_role = context.get("userRole") or context.get("user_role", "CUSTOMER")
    user_id = context.get("userId") or context.get("user_id", "system")
    conversation_id = context.get("conversationId") or context.get("conversation_id", f"conv-{uuid.uuid4()}")

    now = datetime.now(timezone.utc).isoformat()
    exec_id = f"exec-{uuid.uuid4().hex[:8]}"

    result: Dict[str, Any] = {"success": False, "error": None, "data": None}

    try:
        # 1. get_customer_profile
        if tool_name == "get_customer_profile":
            if not customer_id:
                result = {"success": False, "error": "Customer identity required"}
            else:
                profile = query_get(
                    "SELECT customer_id, first_name, last_name, email, phone_number, city, state, pincode, customer_status, customer_since FROM customer_profiles WHERE customer_id = ?",
                    (customer_id,)
                )
                if not profile:
                    result = {"success": False, "error": f"Subscriber profile '{customer_id}' not found"}
                else:
                    result = {"success": True, "data": profile}

        # 2. get_active_plan
        elif tool_name == "get_active_plan":
            if not customer_id:
                result = {"success": False, "error": "Customer identity required"}
            else:
                sub = query_get("""
                    SELECT s.subscription_id, s.plan_id, s.mobile_number, s.activation_date, s.expiry_date, s.status,
                           p.name as plan_name, p.price, p.validity_days, p.data_allowance, p.voice_allowance, p.sms_allowance, p.is_5g
                    FROM subscriptions s
                    JOIN telecom_plans p ON s.plan_id = p.plan_id
                    WHERE s.customer_id = ? AND s.status = 'ACTIVE'
                    ORDER BY s.activation_date DESC
                    LIMIT 1
                """, (customer_id,))
                if not sub:
                    result = {"success": True, "data": {"message": "No active plan currently registered. Subscriber needs to recharge."}}
                else:
                    try:
                        exp = datetime.fromisoformat(sub["expiry_date"].replace('Z', '+00:00'))
                        days_rem = max(0, (exp - datetime.now(timezone.utc)).days)
                    except Exception:
                        days_rem = 28
                    sub["daysRemaining"] = days_rem
                    result = {"success": True, "data": sub}

        # 3. get_available_plans
        elif tool_name == "get_available_plans":
            sql = "SELECT * FROM telecom_plans WHERE status = 'ACTIVE'"
            params = []
            if args.get("category"):
                sql += " AND category = ?"
                params.append(args["category"])
            if args.get("is5GOnly"):
                sql += " AND is_5g = 1"
            if args.get("maxPrice"):
                sql += " AND price <= ?"
                params.append(args["maxPrice"])
            sql += " ORDER BY price ASC LIMIT 10"
            plans = query_all(sql, tuple(params))
            result = {"success": True, "data": plans}

        # 4. get_data_usage
        elif tool_name == "get_data_usage":
            usage = query_get("""
                SELECT usage_id, mobile_number, data_used_gb, data_remaining_gb, period_start, period_end
                FROM telecom_usage
                WHERE customer_id = ?
                ORDER BY updated_at DESC
                LIMIT 1
            """, (customer_id,))
            if not usage:
                result = {"success": True, "data": {"data_used_gb": 0.0, "data_remaining_gb": 5.0, "isQuotaExhausted": False}}
            else:
                usage["isQuotaExhausted"] = usage["data_remaining_gb"] <= 0.1
                result = {"success": True, "data": usage}

        # 5. get_voice_usage
        elif tool_name == "get_voice_usage":
            usage = query_get("""
                SELECT voice_used_mins, voice_remaining_mins, mobile_number
                FROM telecom_usage WHERE customer_id = ? LIMIT 1
            """, (customer_id,))
            if not usage:
                result = {"success": True, "data": {"voice_used_mins": 0, "voice_remaining_mins": -1, "unlimited": True}}
            else:
                usage["unlimited"] = usage["voice_remaining_mins"] == -1
                result = {"success": True, "data": usage}

        # 6. get_sms_usage
        elif tool_name == "get_sms_usage":
            usage = query_get("""
                SELECT sms_used, sms_remaining, mobile_number
                FROM telecom_usage WHERE customer_id = ? LIMIT 1
            """, (customer_id,))
            result = {"success": True, "data": usage or {"sms_used": 0, "sms_remaining": 100}}

        # 7. get_recharge_history
        elif tool_name == "get_recharge_history":
            limit = args.get("limit", 5)
            recharges = query_all("""
                SELECT r.*, p.name as plan_name
                FROM recharges r
                LEFT JOIN telecom_plans p ON r.plan_id = p.plan_id
                WHERE r.customer_id = ?
                ORDER BY r.created_at DESC
                LIMIT ?
            """, (customer_id, limit))
            result = {"success": True, "data": recharges}

        # 8. get_recharge_status
        elif tool_name == "get_recharge_status":
            tx_id = args.get("transactionId", "")
            recharge = query_get("""
                SELECT * FROM recharges
                WHERE recharge_id = ? OR transaction_id = ?
            """, (tx_id, tx_id))
            if not recharge:
                result = {"success": False, "error": f"Recharge transaction '{tx_id}' not found"}
            elif user_role == "CUSTOMER" and recharge["customer_id"] != customer_id:
                result = {
                    "success": False,
                    "error": "Security isolation: You cannot inspect recharge records belonging to another customer."
                }
            else:
                result = {"success": True, "data": recharge}

        # 9. get_bill
        elif tool_name == "get_bill":
            bill = query_get("""
                SELECT bill_id, mobile_number, billing_period, amount, due_date, status, breakdown_json, created_at
                FROM bills
                WHERE customer_id = ?
                ORDER BY created_at DESC
                LIMIT 1
            """, (customer_id,))
            if not bill:
                result = {"success": True, "data": {"message": "No outstanding bills. Zero account balance."}}
            else:
                bill["breakdown"] = json.loads(bill.get("breakdown_json") or "{}")
                result = {"success": True, "data": bill}

        # 10. get_billing_history
        elif tool_name == "get_billing_history":
            bills = query_all("""
                SELECT bill_id, mobile_number, billing_period, amount, due_date, status, created_at
                FROM bills
                WHERE customer_id = ?
                ORDER BY created_at DESC
                LIMIT 10
            """, (customer_id,))
            result = {"success": True, "data": bills}

        # 11. get_sim_details
        elif tool_name == "get_sim_details":
            sim = query_get("""
                SELECT sim_id, mobile_number, sim_type, iccid, status, activated_at
                FROM sim_cards
                WHERE customer_id = ?
                LIMIT 1
            """, (customer_id,))
            if not sim:
                result = {"success": False, "error": "SIM card profile not found for this account"}
            else:
                result = {"success": True, "data": sim}

        # 12. check_sim_status
        elif tool_name == "check_sim_status":
            sim = query_get("""
                SELECT sim_type, status, iccid, mobile_number
                FROM sim_cards
                WHERE customer_id = ?
                LIMIT 1
            """, (customer_id,))
            if not sim:
                result = {"success": False, "error": "No registered SIM found"}
            else:
                result = {
                    "success": True,
                    "data": {
                        "status": sim["status"],
                        "simType": sim["sim_type"],
                        "mobileNumber": sim["mobile_number"],
                        "isActive": sim["status"] == "ACTIVE"
                    }
                }

        # 13. check_network_status
        elif tool_name == "check_network_status":
            city = args.get("city")
            if not city:
                c = query_get("SELECT city FROM customer_profiles WHERE customer_id = ?", (customer_id,))
                city = c["city"] if c and c.get("city") else "Mumbai"

            outage = query_get("""
                SELECT * FROM network_outages
                WHERE city LIKE ? AND status != 'RESOLVED'
                LIMIT 1
            """, (f"%{city}%",))
            if outage:
                result = {
                    "success": True,
                    "data": {
                        "status": "DEGRADED",
                        "hasOutage": True,
                        "city": city,
                        "outageDetails": outage,
                    }
                }
            else:
                result = {
                    "success": True,
                    "data": {
                        "status": "OPERATIONAL",
                        "hasOutage": False,
                        "city": city,
                        "networkHealth": "Normal (99.9% uptime)",
                        "signalStrength": "Excellent",
                        "coverage5G": "Available (True 5G SA Core active)",
                    }
                }

        # 14. check_network_outage
        elif tool_name == "check_network_outage":
            city = args.get("city", "").strip()
            outages = query_all("""
                SELECT outage_id, region, city, affected_service, network_type, severity, status, start_time, estimated_resolution, description
                FROM network_outages
                WHERE city LIKE ? AND status != 'RESOLVED'
            """, (f"%{city}%",))
            if not outages:
                result = {
                    "success": True,
                    "data": {
                        "outageFound": False,
                        "city": city,
                        "message": f"No active network outages reported in {city}. All cell towers operating normally.",
                        "activeOutages": []
                    }
                }
            else:
                result = {
                    "success": True,
                    "data": {
                        "outageFound": True,
                        "city": city,
                        "activeOutages": outages
                    }
                }

        # 15. check_5g_coverage
        elif tool_name == "check_5g_coverage":
            location = args.get("location", "India")
            result = {
                "success": True,
                "data": {
                    "location": location,
                    "coverage5GAvailable": True,
                    "technology": "True 5G Standalone (SA)",
                    "frequencyBands": ["n28 (700MHz)", "n78 (3500MHz)", "n258 (26GHz mmWave)"],
                    "estimatedSpeedRange": "350 Mbps - 980 Mbps",
                }
            }

        # 16. get_roaming_plans
        elif tool_name == "get_roaming_plans":
            plans = query_all("""
                SELECT plan_id, name, description, price, validity_days, data_allowance, voice_allowance
                FROM telecom_plans
                WHERE category = 'ROAMING_PACK' OR roaming_available = 1
            """)
            result = {"success": True, "data": plans}

        # 17. create_recharge
        elif tool_name == "create_recharge":
            plan_id = args.get("planId")
            payment_method = args.get("paymentMethod", "UPI")
            plan = query_get("SELECT * FROM telecom_plans WHERE plan_id = ?", (plan_id,))
            if not plan:
                result = {"success": False, "error": f"Plan ID '{plan_id}' not found"}
            else:
                cust = query_get("SELECT phone_number FROM customer_profiles WHERE customer_id = ?", (customer_id,))
                mob = cust["phone_number"] if cust and cust.get("phone_number") else "+91 98765 43210"
                rch_id = f"rch-{uuid.uuid4().hex[:6]}"
                tx_id = f"TXN-UPI-{uuid.uuid4().int % 90000000 + 10000000}"
                exp_date = (datetime.now(timezone.utc) + timedelta(days=plan["validity_days"])).isoformat()

                execute("""
                    INSERT INTO recharges (recharge_id, customer_id, mobile_number, plan_id, amount, payment_method, transaction_id, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'SUCCESS', ?)
                """, (rch_id, customer_id, mob, plan_id, plan["price"], payment_method, tx_id, now))

                existing_sub = query_get("SELECT subscription_id FROM subscriptions WHERE customer_id = ? AND status = 'ACTIVE'", (customer_id,))
                if existing_sub:
                    execute("""
                        UPDATE subscriptions SET plan_id = ?, expiry_date = ?, updated_at = ?
                        WHERE subscription_id = ?
                    """, (plan_id, exp_date, now, existing_sub["subscription_id"]))
                else:
                    execute("""
                        INSERT INTO subscriptions (subscription_id, customer_id, plan_id, mobile_number, activation_date, expiry_date, status, auto_renew, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 1, ?, ?)
                    """, (f"sub-{uuid.uuid4().hex[:6]}", customer_id, plan_id, mob, now, exp_date, now, now))

                # Reset usage quota
                execute("UPDATE telecom_usage SET data_used_gb = 0.0, data_remaining_gb = 10.0, updated_at = ? WHERE customer_id = ?", (now, customer_id))

                # Audit log
                execute("""
                    INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
                    VALUES (?, ?, 'AI', 'CREATE_RECHARGE', 'Recharge', ?, ?, ?)
                """, (f"log-{uuid.uuid4().hex[:8]}", user_id, rch_id, json.dumps({"planId": plan_id, "amount": plan["price"]}), now))

                result = {
                    "success": True,
                    "data": {
                        "message": f"Recharge of ₹{plan['price']} for plan '{plan['name']}' successful!",
                        "rechargeId": rch_id,
                        "transactionId": tx_id,
                        "planName": plan["name"],
                        "validityDays": plan["validity_days"],
                        "newExpiryDate": exp_date
                    }
                }

        # 18. create_support_ticket
        elif tool_name == "create_support_ticket":
            subject = args.get("subject", "Telecom Support Issue")
            description = args.get("description", "Customer requested support")
            category = args.get("category", "NETWORK")
            priority = args.get("priority", "MEDIUM")
            ticket_id = f"TCK-{uuid.uuid4().int % 900 + 100}"

            execute("""
                INSERT INTO support_tickets (ticket_id, customer_id, conversation_id, subject, description, category, priority, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
            """, (ticket_id, customer_id, conversation_id, subject, description, category, priority, now, now))

            execute("""
                INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
                VALUES (?, ?, 'AI', 'CREATE_TICKET', 'SupportTicket', ?, ?, ?)
            """, (f"log-{uuid.uuid4().hex[:8]}", user_id, ticket_id, json.dumps({"category": category, "subject": subject}), now))

            result = {
                "success": True,
                "data": {
                    "ticketId": ticket_id,
                    "subject": subject,
                    "category": category,
                    "priority": priority,
                    "status": "OPEN",
                    "message": f"Telecom support ticket {ticket_id} registered with {priority} priority."
                }
            }

        # 19. escalate_to_human
        elif tool_name == "escalate_to_human":
            reason = args.get("reason", "Customer requested human representative")
            execute("""
                UPDATE conversations
                SET status = 'HUMAN_HANDOFF', escalation_reason = ?, updated_at = ?
                WHERE conversation_id = ?
            """, (reason, now, conversation_id))

            execute("""
                INSERT INTO audit_logs (log_id, actor_id, actor_type, action, entity_type, entity_id, metadata, timestamp)
                VALUES (?, ?, 'AI', 'ESCALATE_TO_HUMAN', 'Conversation', ?, ?, ?)
            """, (f"log-{uuid.uuid4().hex[:8]}", user_id, conversation_id, json.dumps({"reason": reason}), now))

            result = {
                "success": True,
                "escalated": True,
                "data": {
                    "message": "Session transferred to a human telecom support engineer. Please stand by.",
                    "reason": reason
                }
            }

        # 20. search_knowledge_base
        elif tool_name == "search_knowledge_base":
            query = args.get("query", "")
            matches = search_knowledge_base(query, top_k=3)
            result = {"success": True, "data": matches}

        # 21. search_faqs
        elif tool_name == "search_faqs":
            query = args.get("query", "")
            faqs = search_faqs(query, top_k=3)
            result = {"success": True, "data": faqs}

        # Backward compatibility: search_customer (Forbidden for customers)
        elif tool_name == "search_customer":
            if user_role == "CUSTOMER":
                result = {
                    "success": False,
                    "error": "Authorization error: Customers are strictly prohibited from searching other customer profiles."
                }
            else:
                q = f"%{args.get('query', '')}%"
                customers = query_all("SELECT customer_id, first_name, last_name, email, phone_number FROM customer_profiles WHERE first_name LIKE ? OR email LIKE ? LIMIT 5", (q, q))
                result = {"success": True, "data": customers}

        else:
            result = {"success": False, "error": f"Unknown tool '{tool_name}'"}

    except Exception as e:
        result = {"success": False, "error": str(e)}

    # Record tool execution audit
    try:
        execute("""
            INSERT INTO tool_executions (execution_id, conversation_id, tool_name, input, output, status, error, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            exec_id, conversation_id, tool_name,
            json.dumps(args), json.dumps(result.get("data")),
            "SUCCESS" if result["success"] else "ERROR",
            result.get("error"), now
        ))
    except Exception:
        pass

    return result
