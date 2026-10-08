from fastapi import APIRouter, Depends
from app.core.security import require_role
from app.core.response import success_response, error_response
from app.data.database import query_get, query_all

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

@router.get("/dashboard")
def get_dashboard(user: dict = Depends(require_role("ADMIN", "SUPPORT_AGENT"))):
    total_subscribers = (query_get("SELECT COUNT(*) as count FROM customer_profiles") or {}).get("count", 0)
    active_subscribers = (query_get("SELECT COUNT(*) as count FROM customer_profiles WHERE customer_status = 'ACTIVE'") or {}).get("count", 0)
    active_plans = (query_get("SELECT COUNT(*) as count FROM telecom_plans WHERE status = 'ACTIVE'") or {}).get("count", 0)
    today_recharges = (query_get("SELECT COUNT(*) as count FROM recharges") or {}).get("count", 0)
    recharge_revenue = (query_get("SELECT COALESCE(SUM(amount), 0) as total FROM recharges WHERE status = 'SUCCESS'") or {}).get("total", 0)
    open_tickets = (query_get("SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER')") or {}).get("count", 0)
    resolved_tickets = (query_get("SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('RESOLVED', 'CLOSED')") or {}).get("count", 0)
    network_issues = (query_get("SELECT COUNT(*) as count FROM support_tickets WHERE category = 'NETWORK' AND status != 'RESOLVED'") or {}).get("count", 0)
    active_outages = (query_get("SELECT COUNT(*) as count FROM network_outages WHERE status != 'RESOLVED'") or {}).get("count", 0)
    active_conversations = (query_get("SELECT COUNT(*) as count FROM conversations WHERE status IN ('AI_ACTIVE', 'OPEN')") or {}).get("count", 0)
    escalated_conversations = (query_get("SELECT COUNT(*) as count FROM conversations WHERE status IN ('ESCALATED', 'HUMAN_HANDOFF')") or {}).get("count", 0)
    total_ai_conversations = (query_get("SELECT COUNT(*) as count FROM conversations") or {}).get("count", 0)

    total_conv = max(1, total_ai_conversations)
    human_escalation_rate = round((escalated_conversations / total_conv) * 100, 1)
    ai_resolution_rate = round(100.0 - human_escalation_rate, 1)

    recent_tickets = query_all("""
        SELECT t.ticket_id, t.subject, t.category, t.status, t.priority, t.created_at,
               c.first_name as customer_first_name, c.last_name as customer_last_name, c.phone_number
        FROM support_tickets t
        JOIN customer_profiles c ON t.customer_id = c.customer_id
        ORDER BY t.created_at DESC
        LIMIT 6
    """)

    recent_recharges = query_all("""
        SELECT r.recharge_id, r.amount, r.payment_method, r.transaction_id, r.created_at,
               c.first_name, c.last_name, c.phone_number, p.name as plan_name
        FROM recharges r
        JOIN customer_profiles c ON r.customer_id = c.customer_id
        LEFT JOIN telecom_plans p ON r.plan_id = p.plan_id
        ORDER BY r.created_at DESC
        LIMIT 6
    """)

    active_outages_list = query_all("""
        SELECT outage_id, region, city, affected_service, severity, status, estimated_resolution, description
        FROM network_outages
        WHERE status != 'RESOLVED'
        ORDER BY severity DESC
        LIMIT 4
    """)

    recent_audits = query_all("""
        SELECT log_id, actor_type, action, entity_type, entity_id, timestamp
        FROM audit_logs
        ORDER BY timestamp DESC
        LIMIT 8
    """)

    return success_response({
        "metrics": {
            "totalSubscribers": total_subscribers,
            "activeSubscribers": active_subscribers,
            "totalCustomers": total_subscribers,
            "activeCustomers": active_subscribers,
            "activePlans": active_plans,
            "todayRecharges": today_recharges,
            "rechargeRevenue": recharge_revenue,
            "openTickets": open_tickets,
            "resolvedTickets": resolved_tickets,
            "networkIssues": network_issues,
            "activeOutages": active_outages,
            "activeConversations": active_conversations,
            "escalatedConversations": escalated_conversations,
            "totalAIConversations": total_ai_conversations,
            "aiResolutionRate": ai_resolution_rate,
            "humanEscalationRate": human_escalation_rate,
        },
        "recentTickets": recent_tickets,
        "recentRecharges": recent_recharges,
        "activeOutagesList": active_outages_list,
        "recentAudits": recent_audits,
    })

@router.get("/customers")
def list_subscribers(user: dict = Depends(require_role("ADMIN", "SUPPORT_AGENT"))):
    customers = query_all("""
        SELECT customer_id, first_name, last_name, email, phone_number, city, state, customer_status, customer_since
        FROM customer_profiles
        ORDER BY customer_since DESC
    """)
    return success_response(customers)

@router.get("/customers/{id}")
def get_subscriber_detail(id: str, user: dict = Depends(require_role("ADMIN", "SUPPORT_AGENT"))):
    customer = query_get("SELECT * FROM customer_profiles WHERE customer_id = ?", (id,))
    if not customer:
        return error_response("Subscriber not found", 404)
    return success_response(customer)
