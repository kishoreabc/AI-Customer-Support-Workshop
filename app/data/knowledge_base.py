from typing import List, Dict, Any

TELECOM_KNOWLEDGE_DOCS: List[Dict[str, Any]] = [
    {
        "id": "KB-NET-FIBER-01",
        "title": "Home Fiber Broadband Red Light / LOS (Loss of Signal) Troubleshooting & Resolution",
        "category": "NETWORK_FIBER",
        "tags": ["fiber", "red light", "los", "ont", "slow internet", "broadband", "optical"],
        "content": """
## Fiber Optical Network Terminal (ONT) Loss of Signal (LOS) Guide

### Symptoms:
- ONT power light is green or blue, but the 'Optical' or 'LOS' light is blinking or solid RED.
- No internet access on router or Wi-Fi devices.

### Root Causes:
1. Fiber patch cable bent beyond bend radius (<30mm) or disconnected at the green SC/APC coupler.
2. Central Office (OLT) port session locked due to power surge or dirty optic.
3. Neighborhood fiber break or distribution hub splice issue.

### AI Troubleshooting Procedure:
1. Advise customer to check the thin white/yellow fiber cable between wall jack and ONT without removing the connector. Ensure no tight bends or sharp folds.
2. Query the Telecom Network API: `run_line_diagnostic(customer_id)`.
3. If optical receiver power is between -8 dBm and -25 dBm, signal is within tolerance: execute automated `reset_network_port(customer_id)` (remote OLT line kick).
4. If optical power is below -28 dBm or shows 'TOTAL_LOSS', line has physical degradation:
   - Automated port reboot will NOT resolve physical fiber breaks.
   - Immediately escalate to Tier-2 Dispatch with P2 priority for on-site field technician with an optical power meter.
"""
    },
    {
        "id": "KB-NET-5G-02",
        "title": "5G Mobile Data Slow Speeds, Network Throttling & Tower Congestion",
        "category": "NETWORK_MOBILE",
        "tags": ["5g", "slow speed", "data limit", "throttle", "tower", "apn", "cellular"],
        "content": """
## 5G Mobile Data Troubleshooting & Speed Deprioritization

### Policy & Diagnostics:
- Unlimited Elite Plans include 50GB of Premium Priority Data.
- After 50GB threshold during times of local cell tower congestion, speeds may be temporarily deprioritized to 3G/LTE speeds until congestion clears.
- If customer has NOT exceeded threshold, slow speeds typically indicate:
  1. Stale carrier profile on the device.
  2. Local sector antenna maintenance or scheduled upgrade.

### AI Resolution Procedure:
1. Inspect customer plan and current billing cycle data usage.
2. Query Telecom Network API for the customer's registered cell tower status (`get_tower_status`).
3. If tower is running normally and user has remaining priority data:
   - Trigger automated network reprovisioning signal (`send_sim_reprovision_signal`).
   - Guide customer to toggle Airplane Mode for 15 seconds to latch onto the refreshed HLR/VLR register.
4. If tower is undergoing active maintenance:
   - Provide exact estimated restoration time (ERT). Auto-resolve with outage notification subscription.
"""
    },
    {
        "id": "KB-BIL-ROAM-01",
        "title": "International Roaming Charges, Dispute Policy & Automatic Credit Guidelines",
        "category": "BILLING_ROAMING",
        "tags": ["roaming", "international", "high bill", "overage", "credit", "waiver", "refund", "mexico", "canada"],
        "content": """
## Billing SOP: International Data Roaming Disputes & Waivers

### Courtesy Waiver Rules:
1. Tier Eligibility: Gold, Platinum, and Business Tier customers with tenure > 12 months and 0 prior billing disputes in the past 12 months qualify for one-time courtesy adjustments.
2. Thresholds:
   - Up to $50.00: The AI Telecom Support Agent is authorized to automatically apply an instant billing credit (`apply_courtesy_credit`) without supervisor approval.
   - Above $50.00: The AI agent may apply $50.00 immediately as an interim credit OR escalate the remaining balance to human Billing Tier-2 support with pre-approved recommendation notes.
3. Prevention:
   - Always offer to activate an International Roaming Pass ($10/day or $45/month) or verify roaming toggles to prevent future unexpected fees.
"""
    },
    {
        "id": "KB-ACC-ESIM-01",
        "title": "eSIM Activation, Digital Transfer & QR Code Delivery SOP",
        "category": "ACCOUNT_SIM",
        "tags": ["esim", "sim", "transfer", "qr code", "activation", "new phone", "pixel", "iphone", "samsung"],
        "content": """
## eSIM Profile Generation & Device Transfer Protocol

### Requirements:
- Device must be carrier-unlocked and compatible with GSMA eSIM specifications (iPhone XS+, Pixel 4+, Galaxy S20+).
- Account must be active and in good standing (no fraud or identity lock flags).

### AI Self-Service Resolution:
1. Verify device model and customer identity from Customer Database.
2. Query Account API to generate a new cryptographic LPA (Local Profile Assistant) activation code: `generate_esim_profile(customer_id)`.
3. Provide the secure activation QR link and SM-DP+ server address (`smdp.telco-cloud.net`).
4. Remind customer to remain connected to Wi-Fi while downloading the eSIM profile.
"""
    },
    {
        "id": "KB-NET-ENT-01",
        "title": "Enterprise Dedicated Leased Line SLA & BGP Flapping Protocol",
        "category": "ENTERPRISE_NETWORK",
        "tags": ["enterprise", "sla", "leased line", "bgp", "noc", "latency", "flapping", "router"],
        "content": """
## Enterprise Mission-Critical SLA & Incident Escalation Policy

### Service Level Agreement:
- Enterprise Dedicated Circuits carry a contractual 99.999% uptime guarantee with maximum 4-hour Mean Time To Resolution (MTTR).
- Automated AI agents are strictly forbidden from performing remote resets on live enterprise circuits without NOC authorization.

### Escalation Protocol:
1. When enterprise metrics report BGP route flapping, optical packet loss, or high latency (>25ms above baseline):
   - Immediately classify as P1 Critical Incident.
   - DO NOT attempt automated soft reboots.
   - Escalate directly to Network Operations Center (NOC) Tier-3 Engineering.
   - Attach live optical telemetry, circuit ID, and router interface logs to the ticket.
   - Notify the Enterprise Account Executive automatically.
"""
    },
    {
        "id": "KB-BIL-PAY-02",
        "title": "Payment Extensions, Due Date Grace Period & Hardship Arrangements",
        "category": "BILLING_PAYMENT",
        "tags": ["due date", "extension", "grace period", "late fee", "payment arrangement", "overdue"],
        "content": """
## Payment Extension & Grace Period Policy

### Rules:
1. Customers with accounts in good standing may request up to a 14-day payment extension on active balances once per 6-month cycle.
2. The AI agent can automatically execute `extend_due_date(customer_id, days)` for requests up to 14 days without human manager review.
3. Late payment fees ($15) will be automatically suppressed during the granted extension window.
"""
    }
]
