import copy
from typing import Dict, Any, Optional, List

# Realistic Mock Customer Database for Telecom Operations
INITIAL_CUSTOMERS: Dict[str, Dict[str, Any]] = {
    "CUST-101": {
        "customer_id": "CUST-101",
        "name": "Alice Chen",
        "email": "alice.chen@example.com",
        "phone": "+1 (555) 234-5678",
        "account_number": "ACC-89211",
        "tier": "Gold VIP",
        "tenure_months": 38,
        "plan": {
            "name": "5G Unlimited Elite",
            "type": "Mobile Postpaid",
            "monthly_rate": 85.00,
            "data_limit_gb": "Unlimited (50GB Priority)",
            "hotspot_gb": 30,
            "features": ["5G Ultra Wideband", "Free International Texting", "HD Streaming"]
        },
        "devices": [
            {
                "type": "Smartphone",
                "model": "Apple iPhone 15 Pro",
                "imei": "356789123456789",
                "sim_type": "eSIM",
                "sim_id": "SIM-89014103211",
                "status": "Active"
            }
        ],
        "billing": {
            "status": "Current",
            "current_balance": 85.00,
            "last_payment_date": "2026-09-28",
            "autopay_enabled": True,
            "dispute_history_count": 0
        },
        "service_address": {
            "street": "1428 Elm Street, Apt 4B",
            "city": "Seattle",
            "state": "WA",
            "zip": "98101"
        },
        "roaming_enabled": False,
        "notes": "Prefers SMS notifications. High data user."
    },
    "CUST-102": {
        "customer_id": "CUST-102",
        "name": "Bob Smith",
        "email": "bob.smith@example.com",
        "phone": "+1 (555) 345-6789",
        "account_number": "ACC-44912",
        "tier": "Silver",
        "tenure_months": 14,
        "plan": {
            "name": "Fiber Gigabit Home (1000/1000 Mbps)",
            "type": "Fixed Broadband",
            "monthly_rate": 79.99,
            "speed": "1000 Mbps Symmetric",
            "equipment": "ONT Nokia XS-010X-Q + Wi-Fi 6 Gateway"
        },
        "devices": [
            {
                "type": "ONT",
                "model": "Nokia XS-010X-Q",
                "serial": "NOKG128955",
                "firmware": "v4.2.1-fiber",
                "status": "Optical LOS Alarm (Red Light)"
            }
        ],
        "billing": {
            "status": "Current",
            "current_balance": 79.99,
            "last_payment_date": "2026-10-01",
            "autopay_enabled": True,
            "dispute_history_count": 0
        },
        "service_address": {
            "street": "742 Evergreen Terrace",
            "city": "Springfield",
            "state": "OR",
            "zip": "97477"
        },
        "notes": "Works from home as software engineer. Sensitive to downtime."
    },
    "CUST-103": {
        "customer_id": "CUST-103",
        "name": "Carlos Rodriguez",
        "email": "carlos.rodriguez@example.com",
        "phone": "+1 (555) 456-7890",
        "account_number": "ACC-78320",
        "tier": "Platinum Business",
        "tenure_months": 52,
        "plan": {
            "name": "Business Unlimited Global",
            "type": "Mobile Postpaid",
            "monthly_rate": 110.00,
            "data_limit_gb": "Unlimited",
            "features": ["Domestic Priority", "Standard Roaming (Canada/Mexico 5GB)"]
        },
        "devices": [
            {
                "type": "Smartphone",
                "model": "Samsung Galaxy S24 Ultra",
                "imei": "358912349018274",
                "sim_type": "Physical SIM",
                "sim_id": "SIM-89014199821",
                "status": "Active"
            }
        ],
        "billing": {
            "status": "Review Required",
            "current_balance": 175.00,  # Base 110 + 65 roaming overage
            "last_payment_date": "2026-09-15",
            "autopay_enabled": True,
            "dispute_history_count": 0,
            "recent_charge_breakdown": {
                "base_plan": 110.00,
                "international_roaming_overage": 65.00,
                "description": "6.5 GB cellular data used in Cancun, Mexico exceeding standard 5GB pass."
            }
        },
        "service_address": {
            "street": "88 Corporate Plaza, Suite 900",
            "city": "Austin",
            "state": "TX",
            "zip": "78701"
        },
        "notes": "Long-term VIP client. Never disputed a charge before."
    },
    "CUST-104": {
        "customer_id": "CUST-104",
        "name": "Elena Rostova",
        "email": "elena.rostova@example.com",
        "phone": "+1 (555) 567-8901",
        "account_number": "ACC-12904",
        "tier": "Bronze",
        "tenure_months": 6,
        "plan": {
            "name": "Prepaid Flex Plus",
            "type": "Mobile Prepaid",
            "monthly_rate": 45.00,
            "data_limit_gb": "25GB 5G High Speed",
            "features": ["Unlimited Talk/Text", "5G Access"]
        },
        "devices": [
            {
                "type": "Smartphone",
                "model": "Google Pixel 8 Pro",
                "imei": "352341908127364",
                "sim_type": "eSIM",
                "sim_id": "SIM-89014112345",
                "status": "Pending Activation / New Device Setup"
            }
        ],
        "billing": {
            "status": "Paid",
            "current_balance": 0.00,
            "last_payment_date": "2026-10-02",
            "autopay_enabled": False,
            "dispute_history_count": 0
        },
        "service_address": {
            "street": "210 Market Street",
            "city": "San Francisco",
            "state": "CA",
            "zip": "94105"
        },
        "notes": "Upgraded device yesterday, needs eSIM QR code to activate."
    },
    "CUST-105": {
        "customer_id": "CUST-105",
        "name": "David Miller",
        "email": "d.miller@fintechcloud.corp",
        "phone": "+1 (555) 678-9012",
        "account_number": "ACC-99001",
        "tier": "Enterprise Mission Critical",
        "tenure_months": 64,
        "plan": {
            "name": "Enterprise Dedicated Leased Line 10Gbps",
            "type": "Enterprise Dedicated Circuit",
            "monthly_rate": 2800.00,
            "sla": "99.999% Uptime (4-hour MTTR)",
            "circuit_id": "CKT-WDC-SFO-10G-099"
        },
        "devices": [
            {
                "type": "Cisco Edge Router",
                "model": "Cisco ASR 9000 Series",
                "serial": "CSCO-ASR-88192",
                "status": "BGP Flapping / High Latency Warning"
            }
        ],
        "billing": {
            "status": "Enterprise Master Invoicing",
            "current_balance": 2800.00,
            "last_payment_date": "2026-09-20",
            "autopay_enabled": True,
            "dispute_history_count": 0
        },
        "service_address": {
            "street": "500 Data Center Boulevard",
            "city": "Ashburn",
            "state": "VA",
            "zip": "20147"
        },
        "notes": "Mission-critical financial clearing house. Any outage triggers financial penalties."
    }
}

class CustomerDatabase:
    def __init__(self):
        self._customers: Dict[str, Dict[str, Any]] = copy.deepcopy(INITIAL_CUSTOMERS)
    
    def get_customer(self, customer_id: str) -> Optional[Dict[str, Any]]:
        cust = self._customers.get(customer_id)
        return copy.deepcopy(cust) if cust else None
    
    def get_all_customers(self) -> List[Dict[str, Any]]:
        return [copy.deepcopy(c) for c in self._customers.values()]
    
    def update_customer(self, customer_id: str, updates: Dict[str, Any]) -> bool:
        if customer_id in self._customers:
            self._customers[customer_id].update(updates)
            return True
        return False
    
    def reset(self):
        self._customers = copy.deepcopy(INITIAL_CUSTOMERS)

# Singleton instance
customer_db = CustomerDatabase()
