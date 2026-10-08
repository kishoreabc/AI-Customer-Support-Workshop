import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from app.core.security import get_current_user, require_role
from app.core.response import success_response, error_response
from app.data.database import query_get, query_all, execute

router = APIRouter(prefix="/api/v1/plans", tags=["plans"])

class CreatePlanRequest(BaseModel):
    name: str
    description: str
    price: float
    validityDays: int
    dataAllowance: str
    voiceAllowance: Optional[str] = "Unlimited Calls"
    smsAllowance: Optional[str] = "100 SMS/day"
    networkType: Optional[str] = "5G"
    is5G: Optional[bool] = True
    roamingAvailable: Optional[bool] = True
    category: Optional[str] = "UNLIMITED_5G"
    status: Optional[str] = "ACTIVE"

@router.get("")
def list_plans(
    category: Optional[str] = Query(None),
    is5G: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    sql = "SELECT * FROM telecom_plans WHERE 1=1"
    params = []

    if category and category != "ALL":
        sql += " AND category = ?"
        params.append(category)
    if is5G is True:
        sql += " AND is_5g = 1"
    if search:
        sql += " AND (name LIKE ? OR description LIKE ? OR data_allowance LIKE ?)"
        p = f"%{search}%"
        params.extend([p, p, p])
    if user["role"] == "CUSTOMER":
        sql += " AND status = 'ACTIVE'"

    sql += " ORDER BY price ASC"
    plans = query_all(sql, tuple(params))
    return success_response(plans)

@router.get("/{id}")
def get_plan(id: str, user: dict = Depends(get_current_user)):
    plan = query_get("SELECT * FROM telecom_plans WHERE plan_id = ?", (id,))
    if not plan:
        return error_response("Telecom plan not found", 404)
    return success_response(plan)

@router.post("")
def create_plan(body: CreatePlanRequest, user: dict = Depends(require_role("ADMIN"))):
    plan_id = f"plan-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()

    execute("""
        INSERT INTO telecom_plans (
            plan_id, name, description, price, currency, validity_days, data_allowance,
            voice_allowance, sms_allowance, network_type, is_5g, roaming_available, category, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        plan_id, body.name, body.description, body.price, body.validityDays,
        body.dataAllowance, body.voiceAllowance, body.smsAllowance, body.networkType,
        1 if body.is5G else 0, 1 if body.roamingAvailable else 0, body.category, body.status, now, now
    ))

    created = query_get("SELECT * FROM telecom_plans WHERE plan_id = ?", (plan_id,))
    return success_response(created, 201)
