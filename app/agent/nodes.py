import time
from typing import Dict, Any
from app.agent.state import AgentState
from app.models.schemas import TelecomTraceStep, SupportTicket
from app.data.database import customer_db
from app.data.tickets import ticket_store
from app.services.rag_service import rag_service
from app.services.telecom_apis import TelecomNetworkAPI, TelecomBillingAPI, TelecomAccountAPI
from app.services.llm_service import llm_service

def node_understand_issue(state: AgentState) -> Dict[str, Any]:
    """Node: Issue Understanding (Classification + Intent)"""
    start_time = time.time()
    customer_id = state.get("customer_id", "")
    message = state.get("message", "")
    provider = state.get("provider_override")
    api_key = state.get("api_key_override")
    
    # Quick initial profile lookup
    cust = customer_db.get_customer(customer_id) or {}
    classification = llm_service.classify_issue(message, cust, provider=provider, api_key=api_key)
    
    trace_step = TelecomTraceStep(
        step_name="issue_understanding",
        title="Issue Understanding: Classification + Intent",
        status="COMPLETED",
        data={
            "category": classification.category,
            "intent": classification.intent,
            "urgency": classification.urgency,
            "sentiment": classification.sentiment,
            "churn_risk_score": classification.churn_risk_score,
            "summary": classification.summary
        },
        duration_ms=round((time.time() - start_time) * 1000, 1)
    )
    
    current_trace = list(state.get("trace", []))
    current_trace.append(trace_step)
    
    return {
        "classification": classification,
        "trace": current_trace
    }

def node_fetch_customer_context(state: AgentState) -> Dict[str, Any]:
    """Node: Fetch Customer Context from Customer Database"""
    start_time = time.time()
    customer_id = state.get("customer_id", "")
    cust = customer_db.get_customer(customer_id) or {
        "customer_id": customer_id,
        "name": "Guest Customer",
        "tier": "Standard",
        "plan": {"name": "Basic Mobile"}
    }
    
    trace_step = TelecomTraceStep(
        step_name="customer_context",
        title="Customer Context: Profile & CRM Database",
        status="COMPLETED",
        data={
            "customer_id": cust.get("customer_id"),
            "name": cust.get("name"),
            "tier": cust.get("tier"),
            "plan": cust.get("plan", {}).get("name"),
            "tenure_months": cust.get("tenure_months", 0),
            "billing_status": cust.get("billing", {}).get("status")
        },
        duration_ms=round((time.time() - start_time) * 1000, 1)
    )
    
    current_trace = list(state.get("trace", []))
    current_trace.append(trace_step)
    
    return {
        "customer_context": cust,
        "trace": current_trace
    }

def node_retrieve_knowledge(state: AgentState) -> Dict[str, Any]:
    """Node: RAG - Knowledge Base Search"""
    start_time = time.time()
    message = state.get("message", "")
    classification = state.get("classification")
    category = classification.category if classification else None
    
    rag_docs = rag_service.search(message, category_filter=category, top_k=2)
    
    trace_step = TelecomTraceStep(
        step_name="rag_knowledge",
        title="RAG: Knowledge Base Documents Retrieved",
        status="COMPLETED",
        data={
            "matched_documents_count": len(rag_docs),
            "documents": [{"id": d["id"], "title": d["title"], "score": d["score"]} for d in rag_docs]
        },
        duration_ms=round((time.time() - start_time) * 1000, 1)
    )
    
    current_trace = list(state.get("trace", []))
    current_trace.append(trace_step)
    
    return {
        "rag_sources": rag_docs,
        "trace": current_trace
    }

def node_query_telecom_apis(state: AgentState) -> Dict[str, Any]:
    """Node: Query Telecom Operational APIs (Network, Billing, Account)"""
    start_time = time.time()
    customer_id = state.get("customer_id", "")
    
    # 1. Network API
    net_status = TelecomNetworkAPI.get_network_status(customer_id)
    net_diag = TelecomNetworkAPI.run_line_diagnostic(customer_id)
    
    # 2. Billing API
    billing_data = TelecomBillingAPI.get_billing_details(customer_id)
    
    # 3. Account API
    account_data = TelecomAccountAPI.get_account_services(customer_id)
    
    api_payload = {
        "network_status": net_status,
        "network_diagnostic": net_diag,
        "billing_details": billing_data,
        "account_services": account_data
    }
    
    trace_step = TelecomTraceStep(
        step_name="telecom_apis",
        title="Telecom APIs: Live Telemetry & Systems Status",
        status="COMPLETED",
        data={
            "network_service_type": net_status.get("service_type"),
            "network_health": net_status.get("line_state") or net_status.get("data_connection_status"),
            "billing_current_balance": billing_data.get("current_balance"),
            "devices_count": len(account_data.get("devices", []))
        },
        duration_ms=round((time.time() - start_time) * 1000, 1)
    )
    
    current_trace = list(state.get("trace", []))
    current_trace.append(trace_step)
    
    return {
        "telecom_api_data": api_payload,
        "trace": current_trace
    }

def node_llm_reasoning(state: AgentState) -> Dict[str, Any]:
    """Node: LLM Reasoning & Action/Decision Synthesis"""
    start_time = time.time()
    customer_info = state.get("customer_context") or {}
    classification = state.get("classification")
    rag_docs = state.get("rag_sources") or []
    api_data = state.get("telecom_api_data") or {}
    provider = state.get("provider_override")
    api_key = state.get("api_key_override")
    
    reasoning, decision = llm_service.reason_and_decide(
        customer_info=customer_info,
        classification=classification,
        rag_docs=rag_docs,
        api_data=api_data,
        provider=provider,
        api_key=api_key
    )
    
    trace_step = TelecomTraceStep(
        step_name="llm_reasoning",
        title="LLM Reasoning & Strategic Decision",
        status="COMPLETED",
        data={
            "action_type": decision.action_type,
            "confidence": decision.confidence,
            "decision_reason": decision.reason,
            "reasoning_steps": reasoning.split("\n")
        },
        duration_ms=round((time.time() - start_time) * 1000, 1)
    )
    
    current_trace = list(state.get("trace", []))
    current_trace.append(trace_step)
    
    return {
        "llm_reasoning": reasoning,
        "decision": decision,
        "trace": current_trace
    }

def route_decision(state: AgentState) -> str:
    """Conditional Edge Router: routes to auto_resolve, human_support, or format_response"""
    decision = state.get("decision")
    if not decision:
        return "format_response"
    
    if decision.action_type == "AUTO_RESOLVE":
        return "auto_resolve"
    elif decision.action_type == "HUMAN_SUPPORT":
        return "human_support"
    else:
        return "format_response"

def node_auto_resolve(state: AgentState) -> Dict[str, Any]:
    """Node: Auto Resolve Execution via Telecom APIs"""
    start_time = time.time()
    customer_id = state.get("customer_id", "")
    decision = state.get("decision")
    action_details = decision.action_details if decision else {}
    action_name = action_details.get("action_name", "") if action_details else ""
    params = action_details.get("params", {}) if action_details else {}
    
    result = {}
    if action_name == "reset_network_port":
        result = TelecomNetworkAPI.reset_network_port(customer_id)
    elif action_name == "send_sim_reprovision_signal":
        result = TelecomNetworkAPI.send_sim_reprovision_signal(customer_id)
    elif action_name == "apply_courtesy_credit":
        amt = params.get("amount", 50.0)
        reason = params.get("reason", "Automated courtesy credit")
        result = TelecomBillingAPI.apply_courtesy_credit(customer_id, amt, reason)
    elif action_name == "generate_esim_profile":
        result = TelecomAccountAPI.generate_esim_profile(customer_id)
    elif action_name == "extend_payment_due_date":
        days = params.get("days", 14)
        result = TelecomBillingAPI.extend_payment_due_date(customer_id, days)
    else:
        result = {"status": "SUCCESS", "message": f"Action '{action_name}' executed automatically."}
    
    trace_step = TelecomTraceStep(
        step_name="auto_resolve",
        title="Auto Resolve: Executed Telecom Action",
        status="COMPLETED",
        data={
            "action_executed": action_name,
            "execution_result": result
        },
        duration_ms=round((time.time() - start_time) * 1000, 1)
    )
    
    current_trace = list(state.get("trace", []))
    current_trace.append(trace_step)
    
    return {
        "action_result": result,
        "trace": current_trace
    }

def node_human_support(state: AgentState) -> Dict[str, Any]:
    """Node: Human Support Handover & Ticketing"""
    start_time = time.time()
    customer_id = state.get("customer_id", "")
    customer_info = state.get("customer_context") or {}
    classification = state.get("classification")
    decision = state.get("decision")
    action_details = decision.action_details if decision else {}
    
    assigned_queue = action_details.get("assigned_queue", "TIER2_SPECIALIST_QUEUE") if action_details else "TIER2_SPECIALIST_QUEUE"
    priority = action_details.get("priority", "P2") if action_details else "P2"
    
    diagnostic_logs = [
        f"Customer Tier: {customer_info.get('tier')}",
        f"Intent: {classification.intent if classification else 'unspecified'}",
        f"Urgency: {classification.urgency if classification else 'MEDIUM'}"
    ]
    
    ticket: SupportTicket = ticket_store.create_ticket(
        customer_id=customer_id,
        customer_name=customer_info.get("name", "Unknown"),
        category=classification.category if classification else "GENERAL",
        priority=priority,
        assigned_queue=assigned_queue,
        summary=classification.summary if classification else "Escalation requested",
        diagnostic_logs=diagnostic_logs,
        ai_handover_notes=decision.reason if decision else "Handover to Human Support agent"
    )
    
    trace_step = TelecomTraceStep(
        step_name="human_support",
        title="Human Support: Created Escalation Ticket",
        status="COMPLETED",
        data={
            "ticket_id": ticket.ticket_id,
            "priority": ticket.priority,
            "assigned_queue": ticket.assigned_queue,
            "summary": ticket.summary
        },
        duration_ms=round((time.time() - start_time) * 1000, 1)
    )
    
    current_trace = list(state.get("trace", []))
    current_trace.append(trace_step)
    
    return {
        "ticket": ticket,
        "trace": current_trace
    }

def node_format_response(state: AgentState) -> Dict[str, Any]:
    """Node: Response / Ticket Generation for Customer"""
    start_time = time.time()
    customer_info = state.get("customer_context") or {}
    classification = state.get("classification")
    reasoning = state.get("llm_reasoning", "")
    decision = state.get("decision")
    action_result = state.get("action_result")
    ticket = state.get("ticket").model_dump() if state.get("ticket") else None
    provider = state.get("provider_override")
    api_key = state.get("api_key_override")
    
    final_text = llm_service.generate_final_response(
        customer_info=customer_info,
        classification=classification,
        reasoning=reasoning,
        decision=decision,
        action_result=action_result,
        ticket=ticket,
        provider=provider,
        api_key=api_key
    )
    
    trace_step = TelecomTraceStep(
        step_name="response_ticket",
        title="Response / Ticket Delivered to Customer",
        status="COMPLETED",
        data={
            "response_preview": final_text[:120] + "...",
            "ticket_attached": bool(ticket)
        },
        duration_ms=round((time.time() - start_time) * 1000, 1)
    )
    
    current_trace = list(state.get("trace", []))
    current_trace.append(trace_step)
    
    return {
        "final_response": final_text,
        "trace": current_trace
    }
