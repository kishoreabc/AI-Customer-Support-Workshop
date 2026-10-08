import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.security import get_current_user, require_role
from app.core.response import success_response, error_response
from app.data.database import query_get, query_all, execute

router = APIRouter(prefix="/api/v1/tickets", tags=["tickets"])

class CreateTicketRequest(BaseModel):
    subject: str
    description: str
    category: Optional[str] = "NETWORK"
    priority: Optional[str] = "MEDIUM"

@router.get("/me")
def get_my_tickets(user: dict = Depends(get_current_user)):
    customer_id = user.get("customerId")
    if not customer_id:
        return error_response("Customer ID missing from auth session", 403)

    tickets = query_all("""
        SELECT * FROM support_tickets
        WHERE customer_id = ?
        ORDER BY created_at DESC
    """, (customer_id,))
    return success_response(tickets)

@router.post("")
def create_ticket(body: CreateTicketRequest, user: dict = Depends(get_current_user)):
    customer_id = user.get("customerId")
    if not customer_id:
        return error_response("Customer ID missing from auth session", 403)

    ticket_id = f"TCK-{uuid.uuid4().int % 900 + 100}"
    now = datetime.now(timezone.utc).isoformat()

    execute("""
        INSERT INTO support_tickets (
            ticket_id, customer_id, subject, description, category, priority, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
    """, (ticket_id, customer_id, body.subject, body.description, body.category, body.priority, now, now))

    created = query_get("SELECT * FROM support_tickets WHERE ticket_id = ?", (ticket_id,))
    return success_response(created, 201)

@router.get("")
def list_all_tickets(user: dict = Depends(require_role("ADMIN", "SUPPORT_AGENT"))):
    tickets = query_all("""
        SELECT t.*, c.first_name as customer_first_name, c.last_name as customer_last_name, c.phone_number
        FROM support_tickets t
        JOIN customer_profiles c ON t.customer_id = c.customer_id
        ORDER BY t.created_at DESC
        LIMIT 50
    """)
    return success_response(tickets)
