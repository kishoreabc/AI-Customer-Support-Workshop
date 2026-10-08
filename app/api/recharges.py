import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from app.core.security import get_current_user, require_role
from app.core.response import success_response, error_response
from app.data.database import query_get, query_all, execute

router = APIRouter(prefix="/api/v1/recharges", tags=["recharges"])

class CreateRechargeRequest(BaseModel):
    planId: str
    mobileNumber: Optional[str] = None
    paymentMethod: Optional[str] = "UPI"

@router.get("/me")
def get_my_recharges(user: dict = Depends(get_current_user)):
    customer_id = user.get("customerId")
    if not customer_id:
        return error_response("Customer ID missing from auth session", 403)

    recharges = query_all("""
        SELECT r.*, p.name as plan_name, p.data_allowance, p.validity_days
        FROM recharges r
        LEFT JOIN telecom_plans p ON r.plan_id = p.plan_id
        WHERE r.customer_id = ?
        ORDER BY r.created_at DESC
        LIMIT 20
    """, (customer_id,))
    return success_response(recharges)

@router.post("")
def execute_recharge(body: CreateRechargeRequest, user: dict = Depends(get_current_user)):
    customer_id = user.get("customerId")
    if not customer_id:
        return error_response("Customer ID missing from auth session", 403)

    plan = query_get("SELECT * FROM telecom_plans WHERE plan_id = ?", (body.planId,))
    if not plan:
        return error_response("Invalid plan selected", 404)

    customer = query_get("SELECT phone_number FROM customer_profiles WHERE customer_id = ?", (customer_id,))
    mobile_number = body.mobileNumber or (customer.get("phone_number") if customer else "+91 98765 43210")

    recharge_id = f"rch-{uuid.uuid4().hex[:6]}"
    txn_id = f"TXN-UPI-{uuid.uuid4().int % 90000000 + 10000000}"
    now = datetime.now(timezone.utc).isoformat()
    expiry_date = (datetime.now(timezone.utc) + timedelta(days=plan["validity_days"])).isoformat()

    execute("""
        INSERT INTO recharges (recharge_id, customer_id, mobile_number, plan_id, amount, payment_method, transaction_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'SUCCESS', ?)
    """, (recharge_id, customer_id, mobile_number, body.planId, plan["price"], body.paymentMethod, txn_id, now))

    existing_sub = query_get("SELECT subscription_id FROM subscriptions WHERE customer_id = ? AND status = 'ACTIVE'", (customer_id,))
    if existing_sub:
        execute("""
            UPDATE subscriptions SET plan_id = ?, expiry_date = ?, updated_at = ?
            WHERE subscription_id = ?
        """, (body.planId, expiry_date, now, existing_sub["subscription_id"]))
    else:
        execute("""
            INSERT INTO subscriptions (subscription_id, customer_id, plan_id, mobile_number, activation_date, expiry_date, status, auto_renew, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 1, ?, ?)
        """, (f"sub-{uuid.uuid4().hex[:6]}", customer_id, body.planId, mobile_number, now, expiry_date, now, now))

    # Reset usage quota
    execute("UPDATE telecom_usage SET data_used_gb = 0.0, data_remaining_gb = 10.0, updated_at = ? WHERE customer_id = ?", (now, customer_id))

    created = query_get("SELECT * FROM recharges WHERE recharge_id = ?", (recharge_id,))
    return success_response(created, 201)

@router.get("")
def list_all_recharges(
    search: Optional[str] = Query(None),
    user: dict = Depends(require_role("ADMIN", "SUPPORT_AGENT"))
):
    sql = """
        SELECT r.*, p.name as plan_name, c.first_name, c.last_name, c.email
        FROM recharges r
        LEFT JOIN telecom_plans p ON r.plan_id = p.plan_id
        JOIN customer_profiles c ON r.customer_id = c.customer_id
        WHERE 1=1
    """
    params = []
    if search:
        sql += " AND (c.first_name LIKE ? OR r.mobile_number LIKE ? OR r.transaction_id LIKE ?)"
        p = f"%{search}%"
        params.extend([p, p, p])

    sql += " ORDER BY r.created_at DESC LIMIT 50"
    recharges = query_all(sql, tuple(params))
    return success_response(recharges)
