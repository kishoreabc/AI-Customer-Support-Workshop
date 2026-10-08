import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import ChatRequest, ChatResponse, SupportTicket
from app.agent.graph import telecom_agent, get_graph_metadata
from app.data.database import customer_db
from app.data.tickets import ticket_store
from app.data.knowledge_base import TELECOM_KNOWLEDGE_DOCS
from app.services.telecom_apis import TelecomNetworkAPI, TelecomBillingAPI, TelecomAccountAPI
from app.config import settings

logger = logging.getLogger("telecom_api")
router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest):
    """
    Main conversational agent entrypoint.
    Executes the full LangGraph pipeline:
    1. Issue Understanding
    2. Context Gathering (Customer DB, RAG KB, Telecom APIs)
    3. LLM Reasoning
    4. Action/Decision (Auto-Resolve vs Human-Support)
    5. Output Generation
    """
    initial_state = {
        "customer_id": payload.customer_id,
        "message": payload.message,
        "session_id": payload.session_id,
        "provider_override": payload.provider_override,
        "api_key_override": payload.api_key_override,
        "classification": None,
        "customer_context": None,
        "rag_sources": None,
        "telecom_api_data": None,
        "llm_reasoning": None,
        "decision": None,
        "action_result": None,
        "ticket": None,
        "final_response": None,
        "trace": []
    }
    
    try:
        final_state = telecom_agent.invoke(initial_state)
        
        return ChatResponse(
            response=final_state.get("final_response") or "Thank you for reaching out to Telecom Support.",
            customer_id=payload.customer_id,
            classification=final_state.get("classification"),
            customer_context=final_state.get("customer_context"),
            rag_sources=final_state.get("rag_sources"),
            telecom_api_data=final_state.get("telecom_api_data"),
            llm_reasoning=final_state.get("llm_reasoning"),
            decision=final_state.get("decision"),
            action_result=final_state.get("action_result"),
            ticket=final_state.get("ticket"),
            trace=final_state.get("trace", [])
        )
    except Exception as e:
        logger.error(f"Error executing telecom LangGraph agent: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/customers", response_model=List[Dict[str, Any]])
async def list_customers():
    """Returns list of all registered demo customers."""
    return customer_db.get_all_customers()

@router.get("/customers/{customer_id}")
async def get_customer(customer_id: str):
    """Returns specific customer account details."""
    cust = customer_db.get_customer(customer_id)
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    return cust

@router.get("/tickets", response_model=List[Dict[str, Any]])
async def list_tickets():
    """Returns all support tickets (escalated to Human Tier-2 / NOC)."""
    return ticket_store.get_all_tickets()

@router.get("/knowledge-base")
async def list_knowledge_base():
    """Returns the articles in the RAG Knowledge Base."""
    return TELECOM_KNOWLEDGE_DOCS

@router.get("/telecom/{category}/{customer_id}")
async def inspect_telecom_api(category: str, customer_id: str):
    """Direct live inspection of Telecom backend systems."""
    if category == "network":
        return {
            "status": TelecomNetworkAPI.get_network_status(customer_id),
            "diagnostic": TelecomNetworkAPI.run_line_diagnostic(customer_id)
        }
    elif category == "billing":
        return TelecomBillingAPI.get_billing_details(customer_id)
    elif category == "account":
        return TelecomAccountAPI.get_account_services(customer_id)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown telecom category '{category}'")

@router.get("/graph")
async def get_graph():
    """Returns the visual node-and-edge layout of the LangGraph architecture."""
    return get_graph_metadata()

@router.post("/reset-demo")
async def reset_demo():
    """Resets the mock database and ticket queue to pristine initial workshop state."""
    customer_db.reset()
    ticket_store.reset()
    return {"status": "SUCCESS", "message": "Demo databases and ticket queue reset successfully."}

@router.get("/status")
async def status_check():
    """Returns system status, active LLM config, and API availability."""
    has_gemini = bool(settings.GEMINI_API_KEY)
    has_openai = bool(settings.OPENAI_API_KEY)
    return {
        "status": "ONLINE",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "llm_config": {
            "configured_provider": settings.LLM_PROVIDER,
            "gemini_available": has_gemini,
            "openai_available": has_openai,
            "default_mode": "Live LLM" if (has_gemini or has_openai) else "Deterministic Telecom AI Reasoning Engine"
        }
    }
