from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    customer_id: str = Field(..., description="ID of the customer, e.g. CUST-101")
    message: str = Field(..., description="Customer message or issue description")
    session_id: Optional[str] = Field(default=None, description="Optional session or conversation ID")
    provider_override: Optional[str] = Field(default=None, description="Optional LLM provider override ('gemini', 'openai', 'mock')")
    api_key_override: Optional[str] = Field(default=None, description="Optional runtime API key")

class IssueClassification(BaseModel):
    category: Literal["NETWORK_ISSUE", "BILLING_QUERY", "ACCOUNT_MANAGEMENT", "GENERAL_INQUIRY"]
    intent: str
    urgency: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    sentiment: Literal["POSITIVE", "NEUTRAL", "FRUSTRATED", "ANGRY"]
    churn_risk_score: int = Field(default=1, ge=1, le=10)
    entities: Dict[str, Any] = Field(default_factory=dict)
    summary: str

class DecisionResult(BaseModel):
    action_type: Literal["AUTO_RESOLVE", "HUMAN_SUPPORT", "GATHER_MORE_INFO"]
    confidence: float
    reason: str
    action_details: Optional[Dict[str, Any]] = None

class SupportTicket(BaseModel):
    ticket_id: str
    customer_id: str
    customer_name: str
    category: str
    priority: Literal["P1", "P2", "P3", "P4"]
    status: Literal["OPEN", "IN_PROGRESS", "RESOLVED", "ESCALATED"]
    assigned_queue: str
    summary: str
    diagnostic_logs: List[str] = Field(default_factory=list)
    ai_handover_notes: str
    created_at: str

class TelecomTraceStep(BaseModel):
    step_name: str
    title: str
    status: str
    data: Dict[str, Any]
    duration_ms: Optional[float] = None

class ChatResponse(BaseModel):
    response: str
    customer_id: str
    classification: Optional[IssueClassification] = None
    customer_context: Optional[Dict[str, Any]] = None
    rag_sources: Optional[List[Dict[str, Any]]] = None
    telecom_api_data: Optional[Dict[str, Any]] = None
    llm_reasoning: Optional[str] = None
    decision: Optional[DecisionResult] = None
    action_result: Optional[Dict[str, Any]] = None
    ticket: Optional[SupportTicket] = None
    trace: List[TelecomTraceStep] = Field(default_factory=list)
