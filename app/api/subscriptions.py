from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.response import success_response, error_response
from app.data.database import query_all

router = APIRouter(prefix="/api/v1/subscriptions", tags=["subscriptions"])

@router.get("/me")
def get_my_subscriptions(user: dict = Depends(get_current_user)):
    customer_id = user.get("customerId")
    if not customer_id:
        return error_response("Customer ID missing from auth session", 403)

    subs = query_all("""
        SELECT s.*, p.name as plan_name, p.price, p.validity_days, p.data_allowance, p.voice_allowance, p.sms_allowance, p.is_5g
        FROM subscriptions s
        JOIN telecom_plans p ON s.plan_id = p.plan_id
        WHERE s.customer_id = ?
        ORDER BY s.activation_date DESC
    """, (customer_id,))
    return success_response(subs)
