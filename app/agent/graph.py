from langgraph.graph import StateGraph, START, END
from app.agent.state import AgentState
from app.agent.nodes import (
    node_understand_issue,
    node_fetch_customer_context,
    node_retrieve_knowledge,
    node_query_telecom_apis,
    node_llm_reasoning,
    route_decision,
    node_auto_resolve,
    node_human_support,
    node_format_response
)

def build_telecom_agent_graph():
    """
    Constructs the LangGraph StateGraph exactly mirroring the workshop architecture diagram:
    
    Customer Request
           ↓
    Issue Understanding (Classification + Intent)
           ↓
    Context Synthesis (Customer DB + RAG Knowledge Base + Telecom APIs)
           ↓
    LLM Reasoning
           ↓
    Action / Decision
       ├── Auto Resolve ──┐
       └── Human Support ─┴──> Response / Ticket -> Customer
    """
    builder = StateGraph(AgentState)
    
    # Add Nodes
    builder.add_node("understand_issue", node_understand_issue)
    builder.add_node("fetch_customer_context", node_fetch_customer_context)
    builder.add_node("retrieve_knowledge", node_retrieve_knowledge)
    builder.add_node("query_telecom_apis", node_query_telecom_apis)
    builder.add_node("llm_reasoning", node_llm_reasoning)
    builder.add_node("auto_resolve", node_auto_resolve)
    builder.add_node("human_support", node_human_support)
    builder.add_node("format_response", node_format_response)
    
    # Add Edges
    builder.add_edge(START, "understand_issue")
    builder.add_edge("understand_issue", "fetch_customer_context")
    builder.add_edge("fetch_customer_context", "retrieve_knowledge")
    builder.add_edge("retrieve_knowledge", "query_telecom_apis")
    builder.add_edge("query_telecom_apis", "llm_reasoning")
    
    # Conditional Routing based on Action / Decision
    builder.add_conditional_edges(
        "llm_reasoning",
        route_decision,
        {
            "auto_resolve": "auto_resolve",
            "human_support": "human_support",
            "format_response": "format_response"
        }
    )
    
    builder.add_edge("auto_resolve", "format_response")
    builder.add_edge("human_support", "format_response")
    builder.add_edge("format_response", END)
    
    return builder.compile()

# Pre-compiled graph instance
telecom_agent = build_telecom_agent_graph()

def get_graph_metadata():
    """Returns visual topology metadata of the LangGraph agent for the frontend."""
    return {
        "nodes": [
            {"id": "START", "label": "Customer Message", "type": "input", "category": "ingress"},
            {"id": "understand_issue", "label": "Issue Understanding", "sub": "Classification + Intent", "category": "analysis"},
            {"id": "fetch_customer_context", "label": "Customer Context", "sub": "Customer Database", "category": "context"},
            {"id": "retrieve_knowledge", "label": "RAG Retrieval", "sub": "Knowledge Base SOPs", "category": "context"},
            {"id": "query_telecom_apis", "label": "Telecom APIs", "sub": "Network / Billing / Account", "category": "context"},
            {"id": "llm_reasoning", "label": "LLM Reasoning", "sub": "Diagnostics & Action Planning", "category": "reasoning"},
            {"id": "auto_resolve", "label": "Auto Resolve", "sub": "Line Kick / Credit / eSIM", "category": "action"},
            {"id": "human_support", "label": "Human Support", "sub": "Escalate to T2 / NOC Desk", "category": "action"},
            {"id": "format_response", "label": "Response / Ticket", "sub": "Customer Output", "category": "egress"},
            {"id": "END", "label": "Delivered", "type": "output", "category": "egress"}
        ],
        "edges": [
            {"from": "START", "to": "understand_issue"},
            {"from": "understand_issue", "to": "fetch_customer_context"},
            {"from": "fetch_customer_context", "to": "retrieve_knowledge"},
            {"from": "retrieve_knowledge", "to": "query_telecom_apis"},
            {"from": "query_telecom_apis", "to": "llm_reasoning"},
            {"from": "llm_reasoning", "to": "auto_resolve", "label": "Can Auto-Resolve"},
            {"from": "llm_reasoning", "to": "human_support", "label": "Needs Human Agent"},
            {"from": "llm_reasoning", "to": "format_response", "label": "Clarification"},
            {"from": "auto_resolve", "to": "format_response"},
            {"from": "human_support", "to": "format_response"},
            {"from": "format_response", "to": "END"}
        ]
    }
