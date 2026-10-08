import copy
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.models.schemas import SupportTicket

INITIAL_TICKETS: List[Dict[str, Any]] = [
    {
        "ticket_id": "TKT-2026-8801",
        "customer_id": "CUST-105",
        "customer_name": "David Miller",
        "category": "ENTERPRISE_NETWORK",
        "priority": "P1",
        "status": "IN_PROGRESS",
        "assigned_queue": "NOC_TIER3_ENTERPRISE",
        "summary": "Circuit CKT-WDC-SFO-10G-099 BGP route flapping during maintenance window",
        "diagnostic_logs": [
            "Optical RX power: -21.4 dBm",
            "BGP State: Active -> Connect -> Established flap count: 14",
            "Latency spike: 42ms above normal baseline"
        ],
        "ai_handover_notes": "Automated triage detected SLA risk. Circuit requires backbone engineer trace. No soft reset initiated per enterprise policy.",
        "created_at": "2026-10-07T14:22:00Z"
    }
]

class TicketStore:
    def __init__(self):
        self._tickets: List[Dict[str, Any]] = copy.deepcopy(INITIAL_TICKETS)
    
    def create_ticket(
        self,
        customer_id: str,
        customer_name: str,
        category: str,
        priority: str,
        assigned_queue: str,
        summary: str,
        diagnostic_logs: List[str],
        ai_handover_notes: str,
        status: str = "OPEN"
    ) -> SupportTicket:
        ticket_id = f"TKT-2026-{uuid.uuid4().hex[:4].upper()}"
        created_at = datetime.now(timezone.utc).isoformat()
        
        ticket_dict = {
            "ticket_id": ticket_id,
            "customer_id": customer_id,
            "customer_name": customer_name,
            "category": category,
            "priority": priority,
            "status": status,
            "assigned_queue": assigned_queue,
            "summary": summary,
            "diagnostic_logs": diagnostic_logs,
            "ai_handover_notes": ai_handover_notes,
            "created_at": created_at
        }
        self._tickets.insert(0, ticket_dict)
        return SupportTicket(**ticket_dict)
    
    def get_all_tickets(self) -> List[Dict[str, Any]]:
        return copy.deepcopy(self._tickets)
    
    def get_ticket(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        for t in self._tickets:
            if t["ticket_id"] == ticket_id:
                return copy.deepcopy(t)
        return None
    
    def reset(self):
        self._tickets = copy.deepcopy(INITIAL_TICKETS)

ticket_store = TicketStore()
