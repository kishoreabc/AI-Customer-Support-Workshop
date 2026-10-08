import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.core.security import get_current_user
from app.core.response import success_response, error_response
from app.data.database import query_get, query_all, execute
from app.agent.orchestrator import process_telecom_message

router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])

class MessageInput(BaseModel):
    content: Optional[str] = None
    message: Optional[str] = None

@router.post("")
def start_conversation(user: dict = Depends(get_current_user)):
    customer_id = user.get("customerId")
    if not customer_id:
        return error_response("Customer ID missing from auth session", 403)

    conv_id = f"conv-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()

    execute("""
        INSERT INTO conversations (conversation_id, customer_id, status, created_at, updated_at)
        VALUES (?, ?, 'AI_ACTIVE', ?, ?)
    """, (conv_id, customer_id, now, now))

    conv = query_get("SELECT * FROM conversations WHERE conversation_id = ?", (conv_id,))
    return success_response(conv, 201)

@router.get("/me")
def list_my_conversations(user: dict = Depends(get_current_user)):
    customer_id = user.get("customerId")
    if not customer_id:
        return error_response("Customer ID missing from auth session", 403)

    convs = query_all("""
        SELECT * FROM conversations
        WHERE customer_id = ?
        ORDER BY updated_at DESC
        LIMIT 20
    """, (customer_id,))
    return success_response(convs)

@router.get("/{id}")
def get_conversation(id: str, user: dict = Depends(get_current_user)):
    conv = query_get("SELECT * FROM conversations WHERE conversation_id = ?", (id,))
    if not conv:
        return error_response("Conversation not found", 404)
    if user["role"] == "CUSTOMER" and conv["customer_id"] != user.get("customerId"):
        return error_response("Access denied: Not your conversation", 403)
    return success_response(conv)

@router.get("/{id}/messages")
def get_messages(id: str, user: dict = Depends(get_current_user)):
    conv = query_get("SELECT * FROM conversations WHERE conversation_id = ?", (id,))
    if not conv:
        return error_response("Conversation not found", 404)
    if user["role"] == "CUSTOMER" and conv["customer_id"] != user.get("customerId"):
        return error_response("Access denied", 403)

    msgs = query_all("""
        SELECT message_id, conversation_id, sender_type, sender_id, content, created_at
        FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
    """, (id,))
    return success_response(msgs)

@router.post("/{id}/messages")
async def post_message(id: str, body: MessageInput, user: dict = Depends(get_current_user)):
    text = (body.content or body.message or "").strip()
    if not text:
        return error_response("Message content cannot be empty", 400)

    conv = query_get("SELECT * FROM conversations WHERE conversation_id = ?", (id,))
    customer_id = user.get("customerId")
    if not conv:
        # Create conversation dynamically if it does not exist yet
        now = datetime.now(timezone.utc).isoformat()
        execute("""
            INSERT INTO conversations (conversation_id, customer_id, status, created_at, updated_at)
            VALUES (?, ?, 'AI_ACTIVE', ?, ?)
        """, (id, customer_id, now, now))
    elif user["role"] == "CUSTOMER" and conv["customer_id"] != customer_id:
        return error_response("Access denied to conversation", 403)

    # Process through the AI Agent Orchestrator
    agent_output = await process_telecom_message(
        conversation_id=id,
        customer_id=customer_id or conv.get("customer_id", "cust-1"),
        user_message=text,
        user_role=user["role"],
        user_id=user["userId"]
    )

    return success_response(agent_output)
