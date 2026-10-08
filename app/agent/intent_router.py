import re
from typing import Dict, List, Any

INTENT_MAP = {
    "HUMAN_ESCALATION": [
        "human", "representative", "real person", "agent", "executive", "talk to someone",
        "speak to a person", "customer care manager", "escalate"
    ],
    "DATA_USAGE": [
        "data", "data left", "data balance", "data remaining", "data usage", "internet balance",
        "mb left", "gb left", "how much data", "quota exhausted", "fup"
    ],
    "PLAN_QUERY": [
        "plan", "plans", "current plan", "active plan", "my plan", "cheapest plan",
        "best plan", "tariff", "validity", "when does my plan expire"
    ],
    "RECHARGE": [
        "recharge", "top up", "renew plan", "buy plan", "pay for plan", "recharge my number",
        "pack", "booster"
    ],
    "RECHARGE_STATUS": [
        "recharge status", "txn", "transaction", "recharge failed", "recharge pending", "did my recharge go through"
    ],
    "NETWORK_OUTAGE": [
        "outage", "tower down", "network down", "breakdown", "cable cut", "blackout",
        "outage in chennai", "outage in mumbai", "outage in pune"
    ],
    "NETWORK_ISSUE": [
        "network", "no signal", "poor signal", "slow internet", "internet not working",
        "speed is slow", "disconnecting", "call drop", "cannot connect", "no service"
    ],
    "5G_SUPPORT": [
        "5g", "5g coverage", "5g speed", "standalone 5g", "true 5g", "5g sa", "5g working"
    ],
    "ESIM_SUPPORT": [
        "esim", "convert to esim", "qr code", "smdp", "activate esim", "digital sim"
    ],
    "SIM_SUPPORT": [
        "sim", "lost sim", "block sim", "sim replacement", "puk", "pin", "stolen phone", "nano sim"
    ],
    "BILLING": [
        "bill", "invoice", "statement", "charges", "charged extra", "why is my bill", "due date"
    ],
    "ROAMING": [
        "roaming", "international", "dubai", "travel", "abroad", "foreign", "roaming pack"
    ],
    "COMPLAINT": [
        "complaint", "terrible", "worst", "unacceptable", "dispute", "refund", "ticket"
    ],
}

FRUSTRATION_KEYWORDS = [
    "terrible", "horrible", "worst service", "useless", "scam", "cheat", "ridiculous",
    "angry", "furious", "unacceptable", "waste of money", "pathetic", "frustrated"
]

HUMAN_KEYWORDS = [
    "human", "real person", "representative", "support agent", "live agent",
    "customer care executive", "talk to human", "speak with human"
]

def classify_intent(message: str) -> str:
    msg = message.lower()

    # Priority 1: Direct Human Escalation
    if any(k in msg for k in HUMAN_KEYWORDS):
        return "HUMAN_ESCALATION"

    # Priority 2: Specific Telecom Domain Keywords
    for intent, keywords in INTENT_MAP.items():
        if any(re.search(r'\b' + re.escape(k) + r'\b', msg) or k in msg for k in keywords):
            return intent

    return "GENERAL_FAQ"

def detect_frustration(message: str) -> bool:
    msg = message.lower()
    return any(k in msg for k in FRUSTRATION_KEYWORDS)

def detect_human_request(message: str) -> bool:
    msg = message.lower()
    return any(k in msg for k in HUMAN_KEYWORDS)

def get_intent_suggested_tools(intent: str) -> List[str]:
    mapping = {
        "DATA_USAGE": ["get_data_usage", "get_active_plan"],
        "PLAN_QUERY": ["get_active_plan", "get_available_plans"],
        "RECHARGE": ["get_available_plans", "create_recharge", "get_active_plan"],
        "RECHARGE_STATUS": ["get_recharge_status", "get_recharge_history"],
        "NETWORK_OUTAGE": ["check_network_outage", "check_network_status"],
        "NETWORK_ISSUE": ["check_network_outage", "check_network_status", "get_data_usage", "create_support_ticket"],
        "5G_SUPPORT": ["check_5g_coverage", "get_active_plan", "search_knowledge_base"],
        "ESIM_SUPPORT": ["get_sim_details", "search_knowledge_base", "search_faqs"],
        "SIM_SUPPORT": ["get_sim_details", "check_sim_status", "create_support_ticket"],
        "BILLING": ["get_bill", "get_billing_history"],
        "ROAMING": ["get_roaming_plans", "search_knowledge_base"],
        "HUMAN_ESCALATION": ["escalate_to_human"],
        "COMPLAINT": ["create_support_ticket", "escalate_to_human"],
        "GENERAL_FAQ": ["search_faqs", "search_knowledge_base"],
    }
    return mapping.get(intent, ["get_active_plan", "search_faqs"])
