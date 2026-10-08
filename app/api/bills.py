import json
from fastapi import APIRouter, Depends
from app.core.security import get_current_user, require_role
from app.core.response import success_response, error_response
from app.data.database import query_get, query_all, execute

router = APIRouter(prefix="/api/v1/bills", tags=["bills"])

@router.get("/me")
def get_my_bills(user: dict = Depends(get_current_user)):
    customer_id = user.get("customerId")
    if not customer_id:
        return error_response("Customer ID missing from auth session", 403)

    bills = query_all("""
        SELECT * FROM bills
        WHERE customer_id = ?
        ORDER BY created_at DESC
    """, (customer_id,))

    for b in bills:
        b["breakdown"] = json.loads(b.get("breakdown_json") or "{}")

    return success_response(bills)

@router.get("")
def list_all_bills(user: dict = Depends(require_role("ADMIN", "SUPPORT_AGENT"))):
    bills = query_all("""
        SELECT b.*, c.first_name, c.last_name, c.email
        FROM bills b
        JOIN customer_profiles c ON b.customer_id = c.customer_id
        ORDER BY b.created_at DESC
        LIMIT 50
    """)

    for b in bills:
        b["breakdown"] = json.loads(b.get("breakdown_json") or "{}")

    return success_response(bills)

@router.post("/{id}/pay")
def pay_bill(id: str, user: dict = Depends(get_current_user)):
    bill = query_get("SELECT * FROM bills WHERE bill_id = ?", (id,))
    if not bill:
        return error_response("Bill not found", 404)

    if user["role"] == "CUSTOMER" and bill["customer_id"] != user.get("customerId"):
        return error_response("Forbidden: Cannot pay bill for another subscriber", 403)

    execute("UPDATE bills SET status = 'PAID' WHERE bill_id = ?", (id,))
    updated = query_get("SELECT * FROM bills WHERE bill_id = ?", (id,))
    if updated:
        updated["breakdown"] = json.loads(updated.get("breakdown_json") or "{}")
    return success_response(updated)
