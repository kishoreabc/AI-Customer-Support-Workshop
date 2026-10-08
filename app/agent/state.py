from typing import TypedDict, Optional, Dict, Any, List
from app.models.schemas import IssueClassification, DecisionResult, SupportTicket, TelecomTraceStep

class AgentState(TypedDict):
    customer_id: str
    message: str
    session_id: Optional[str]
    provider_override: Optional[str]
    api_key_override: Optional[str]
    
    # Architecture Pipeline Components
    classification: Optional[IssueClassification]
    customer_context: Optional[Dict[str, Any]]
    rag_sources: Optional[List[Dict[str, Any]]]
    telecom_api_data: Optional[Dict[str, Any]]
    llm_reasoning: Optional[str]
    decision: Optional[DecisionResult]
    action_result: Optional[Dict[str, Any]]
    ticket: Optional[SupportTicket]
    final_response: Optional[str]
    
    # Audit Trace
    trace: List[TelecomTraceStep]
