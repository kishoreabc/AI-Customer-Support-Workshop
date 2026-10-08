from typing import List, Dict, Any

AI_TOOLS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_customer_profile",
            "description": "Retrieve the telecom subscriber profile, phone number, and account standing of the currently authenticated customer.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_active_plan",
            "description": "Retrieve the currently active telecom/mobile subscription plan, validity days remaining, and expiry date.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_available_plans",
            "description": "Search and filter available telecom plans (5G unlimited, prepaid, annual, data booster, roaming).",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Filter category: UNLIMITED_5G, POPULAR_MONTHLY, ANNUAL, ROAMING_PACK, DATA_BOOSTER",
                    },
                    "is5GOnly": {
                        "type": "boolean",
                        "description": "Filter for plans with Unlimited 5G network support",
                    },
                    "maxPrice": {
                        "type": "number",
                        "description": "Maximum plan price filter in INR",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_data_usage",
            "description": "Get real-time high-speed data consumed and remaining GB for the current billing cycle/day.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_voice_usage",
            "description": "Get total voice minutes used and remaining call balance.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sms_usage",
            "description": "Get daily SMS count sent and remaining quota.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recharge_history",
            "description": "Retrieve recent recharge transactions, amounts, and dates for the subscriber.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Max records to return (default 5)",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recharge_status",
            "description": "Check the status of a specific recharge by transactionId or rechargeId.",
            "parameters": {
                "type": "object",
                "properties": {
                    "transactionId": {
                        "type": "string",
                        "description": "The transaction ID or recharge ID (e.g. TXN-UPI-98761234 or rch-2001)",
                    },
                },
                "required": ["transactionId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_bill",
            "description": "Retrieve the latest postpaid bill, amount due, due date, status, and itemized tax breakdown.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_billing_history",
            "description": "Retrieve past postpaid bills and payment records for the subscriber.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sim_details",
            "description": "Retrieve SIM card or eSIM profile information, ICCID, SIM type, and activation status.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_sim_status",
            "description": "Check whether the subscriber SIM is currently ACTIVE, BLOCKED, or SUSPENDED.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_network_status",
            "description": "Check mobile network tower status, 4G/5G signal health, and service availability in a city or area.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "City name (e.g. Mumbai, Chennai, Pune)",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_network_outage",
            "description": "Check whether there is an active network outage or cable disruption in a specific city/region.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "City to check for regional outages (e.g. Chennai, Mumbai, Pune)",
                    },
                },
                "required": ["city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_5g_coverage",
            "description": "Check 5G Standalone (SA) coverage and availability by city or pincode.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name or pincode (e.g. Chennai or 600017)",
                    },
                },
                "required": ["location"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_roaming_plans",
            "description": "Retrieve domestic and international roaming packs for travellers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "country": {
                        "type": "string",
                        "description": "Destination country (e.g. UAE, USA, UK, Global)",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_recharge",
            "description": "Process and execute an immediate recharge for the authenticated customer using a plan ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "planId": {
                        "type": "string",
                        "description": "The plan ID to recharge with (e.g. plan-5g-799, plan-prep-349, plan-booster-49)",
                    },
                    "paymentMethod": {
                        "type": "string",
                        "description": "Payment method (e.g. UPI, CREDIT_CARD, WALLET)",
                    },
                },
                "required": ["planId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_support_ticket",
            "description": "Create a telecom support ticket for network issues, billing disputes, SIM problems, or general complaints.",
            "parameters": {
                "type": "object",
                "properties": {
                    "subject": {
                        "type": "string",
                        "description": "Short summary of the issue",
                    },
                    "description": {
                        "type": "string",
                        "description": "Detailed description of the customer issue",
                    },
                    "category": {
                        "type": "string",
                        "enum": ["NETWORK", "BILLING", "RECHARGE", "SIM", "PLAN", "ROAMING", "GENERAL"],
                        "description": "Ticket classification category",
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["LOW", "MEDIUM", "HIGH", "URGENT"],
                        "description": "Priority level (defaults to MEDIUM or HIGH for outages)",
                    },
                },
                "required": ["subject", "description"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "escalate_to_human",
            "description": "Escalate the support session immediately to a human telecom agent.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {
                        "type": "string",
                        "description": "Detailed justification for the escalation",
                    },
                },
                "required": ["reason"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": "Search telecom documentation, APN settings, eSIM guides, 5G troubleshooting, and roaming manuals via RAG.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The semantic query text to search",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_faqs",
            "description": "Search telecom FAQs for quick answers regarding recharges, data speeds, and network settings.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The FAQ search keywords",
                    },
                },
                "required": ["query"],
            },
        },
    },
]
