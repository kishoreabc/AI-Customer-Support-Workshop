from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.response import success_response, error_response
from app.data.database import query_get

router = APIRouter(prefix="/api/v1/usage", tags=["usage"])

@router.get("/me")
def get_my_usage(user: dict = Depends(get_current_user)):
    customer_id = user.get("customerId")
    if not customer_id:
        return error_response("Customer ID missing from auth session", 403)

    usage = query_get("""
        SELECT u.*, p.name as plan_name, p.data_allowance
        FROM telecom_usage u
        LEFT JOIN subscriptions s ON u.customer_id = s.customer_id AND s.status = 'ACTIVE'
        LEFT JOIN telecom_plans p ON s.plan_id = p.plan_id
        WHERE u.customer_id = ?
        ORDER BY u.updated_at DESC
        LIMIT 1
    """, (customer_id,))

    if not usage:
        usage = {
            "data_used_gb": 0.0,
            "data_remaining_gb": 10.0,
            "voice_used_mins": 0,
            "voice_remaining_mins": -1,
            "sms_used": 0,
            "sms_remaining": 100,
            "plan_name": "5G Active Plan",
            "data_allowance": "10 GB Daily Quota"
        }

    return success_response(usage)
