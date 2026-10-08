import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from app.data.database import customer_db

class TelecomNetworkAPI:
    """Simulates real-world Telecom Network Operations, OSS/BSS, and Element Management Systems."""
    
    @staticmethod
    def get_network_status(customer_id: str) -> Dict[str, Any]:
        cust = customer_db.get_customer(customer_id)
        if not cust:
            return {"error": "Customer not found"}
        
        plan_type = cust.get("plan", {}).get("type", "")
        
        if "Fiber" in plan_type or "Broadband" in plan_type:
            # Fixed Line Fiber Telemetry
            ont_device = next((d for d in cust.get("devices", []) if d.get("type") == "ONT"), None)
            is_degraded = ont_device and "Red Light" in ont_device.get("status", "")
            return {
                "service_type": "FIBER_GPON",
                "olt_node": "OLT-NW-SPRINGFIELD-04",
                "port_id": "PON 1/2/4:18",
                "optical_power_rx": "-29.4 dBm (Degraded)" if is_degraded else "-18.2 dBm (Optimal)",
                "optical_power_tx": "2.4 dBm (Normal)",
                "ont_status": "LOS_ALARM_ACTIVE" if is_degraded else "ONLINE_SYNCED",
                "line_state": "DOWN" if is_degraded else "UP",
                "packet_loss_pct": 100.0 if is_degraded else 0.0,
                "latency_ms": 999 if is_degraded else 4.2
            }
        elif "Enterprise" in plan_type:
            return {
                "service_type": "ENTERPRISE_LEASED_LINE_10G",
                "circuit_id": cust.get("plan", {}).get("circuit_id", "CKT-UNKNOWN"),
                "bgp_status": "FLAPPING",
                "bgp_flap_count_24h": 14,
                "optical_rx_power": "-21.4 dBm",
                "carrier_jitter_ms": 18.5,
                "sla_risk": "HIGH",
                "automated_actions_permitted": False,
                "mandatory_action": "ESCALATE_TO_NOC"
            }
        else:
            # Cellular Mobile Telemetry (5G / LTE)
            return {
                "service_type": "5G_NR_SA",
                "connected_cell_tower": "TOWER-WA-SEA-98101-B12",
                "signal_strength_rsrp": "-88 dBm (Good)",
                "sinr_db": "18 dB (Excellent)",
                "tower_congestion_level": "MODERATE_SPIKE (Event nearby)",
                "data_priority_status": "ACTIVE_HIGH_PRIORITY",
                "hlr_vlr_registration": "ATTACHED",
                "data_connection_status": "CONNECTED"
            }
    
    @staticmethod
    def run_line_diagnostic(customer_id: str) -> Dict[str, Any]:
        cust = customer_db.get_customer(customer_id)
        if not cust:
            return {"status": "FAILED", "reason": "Customer not found"}
        
        plan_type = cust.get("plan", {}).get("type", "")
        if "Fiber" in plan_type:
            return {
                "test_id": f"DIAG-FBR-{uuid.uuid4().hex[:6].upper()}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "test_name": "Optical Time-Domain Reflectometry & OLT Health Test",
                "result": "ATTENUATION_DETECTED",
                "rx_power_dbm": -29.4,
                "refractive_index": 1.4682,
                "recommended_action": "REBOOT_OLT_PORT_OR_DISPATCH_TECH",
                "port_reboot_success_prob": 0.45
            }
        else:
            return {
                "test_id": f"DIAG-CELL-{uuid.uuid4().hex[:6].upper()}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "test_name": "Cellular Radio Bearer & SIM Protocol Audit",
                "result": "STALE_BEARER_SESSION",
                "recommended_action": "SIM_REPROVISION_SIGNAL",
                "resolution_success_prob": 0.95
            }
    
    @staticmethod
    def reset_network_port(customer_id: str) -> Dict[str, Any]:
        """Performs soft reset on subscriber OLT port or resets mobile bearer."""
        cust = customer_db.get_customer(customer_id)
        if not cust:
            return {"success": False, "message": "Customer not found"}
        
        # If customer had red light, update customer record to simulate successful line reset
        devices = cust.get("devices", [])
        for d in devices:
            if d.get("type") == "ONT":
                d["status"] = "Normal (Green - Synced)"
        customer_db.update_customer(customer_id, {"devices": devices})
        
        return {
            "success": True,
            "action": "OLT_PORT_HARD_BOUNCE",
            "port": "PON 1/2/4:18",
            "time_taken_ms": 350,
            "new_optical_power_rx": "-19.1 dBm (Optimal)",
            "sync_status": "ONLINE",
            "message": "Fiber port re-initialized successfully. ONT optical sync re-established."
        }
    
    @staticmethod
    def send_sim_reprovision_signal(customer_id: str) -> Dict[str, Any]:
        """Sends OTA (Over-The-Air) refresh payload to the SIM / mobile device."""
        return {
            "success": True,
            "action": "OTA_HLR_VLR_REFRESH",
            "signal_id": f"OTA-{uuid.uuid4().hex[:8].upper()}",
            "customer_id": customer_id,
            "message": "Over-The-Air network profile reprovisioned. Device requested to re-register on nearest cellular carrier tower."
        }


class TelecomBillingAPI:
    """Simulates Billing, Invoicing, and Payment Gateway Operations."""
    
    @staticmethod
    def get_billing_details(customer_id: str) -> Dict[str, Any]:
        cust = customer_db.get_customer(customer_id)
        if not cust:
            return {"error": "Customer not found"}
        billing = cust.get("billing", {})
        return {
            "customer_id": customer_id,
            "status": billing.get("status"),
            "current_balance": billing.get("current_balance"),
            "last_payment_date": billing.get("last_payment_date"),
            "autopay_enabled": billing.get("autopay_enabled"),
            "dispute_history_count": billing.get("dispute_history_count", 0),
            "recent_charge_breakdown": billing.get("recent_charge_breakdown", {
                "base_monthly": cust.get("plan", {}).get("monthly_rate", 0),
                "taxes_and_regulatory": 4.12,
                "overage_fees": 0.00
            })
        }
    
    @staticmethod
    def apply_courtesy_credit(customer_id: str, amount: float, reason: str) -> Dict[str, Any]:
        cust = customer_db.get_customer(customer_id)
        if not cust:
            return {"success": False, "message": "Customer not found"}
        
        billing = cust.get("billing", {})
        old_balance = billing.get("current_balance", 0.0)
        new_balance = max(0.0, round(old_balance - amount, 2))
        
        billing["current_balance"] = new_balance
        billing["status"] = "Current" if new_balance <= cust.get("plan", {}).get("monthly_rate", 0) else "Partial Credit Applied"
        customer_db.update_customer(customer_id, {"billing": billing})
        
        credit_id = f"CRD-2026-{uuid.uuid4().hex[:6].upper()}"
        return {
            "success": True,
            "credit_id": credit_id,
            "customer_id": customer_id,
            "amount_credited": amount,
            "old_balance": old_balance,
            "new_balance": new_balance,
            "reason": reason,
            "applied_at": datetime.now(timezone.utc).isoformat()
        }
    
    @staticmethod
    def extend_payment_due_date(customer_id: str, days: int) -> Dict[str, Any]:
        return {
            "success": True,
            "customer_id": customer_id,
            "days_extended": days,
            "new_due_date": "2026-10-22",
            "late_fee_suppressed": True
        }


class TelecomAccountAPI:
    """Simulates Customer Account, Subscription & Device Management APIs."""
    
    @staticmethod
    def get_account_services(customer_id: str) -> Dict[str, Any]:
        cust = customer_db.get_customer(customer_id)
        if not cust:
            return {"error": "Customer not found"}
        return {
            "customer_id": customer_id,
            "tier": cust.get("tier"),
            "tenure_months": cust.get("tenure_months"),
            "plan_name": cust.get("plan", {}).get("name"),
            "devices": cust.get("devices", []),
            "roaming_enabled": cust.get("roaming_enabled", False)
        }
    
    @staticmethod
    def toggle_roaming(customer_id: str, enabled: bool) -> Dict[str, Any]:
        customer_db.update_customer(customer_id, {"roaming_enabled": enabled})
        return {
            "success": True,
            "customer_id": customer_id,
            "roaming_status": "ENABLED" if enabled else "DISABLED"
        }
    
    @staticmethod
    def generate_esim_profile(customer_id: str) -> Dict[str, Any]:
        cust = customer_db.get_customer(customer_id)
        if not cust:
            return {"success": False, "message": "Customer not found"}
        
        eid = "89049032000018273641092837461928"
        matching_id = f"TELCO-{uuid.uuid4().hex[:12].upper()}"
        qr_payload = f"LPA:1$smdp.telco-cloud.net${matching_id}"
        
        # Update device status in DB
        devices = cust.get("devices", [])
        for d in devices:
            if "eSIM" in d.get("sim_type", "") or d.get("type") == "Smartphone":
                d["status"] = "Active (Profile Provisioned)"
        customer_db.update_customer(customer_id, {"devices": devices})
        
        return {
            "success": True,
            "customer_id": customer_id,
            "matching_id": matching_id,
            "smdp_address": "smdp.telco-cloud.net",
            "activation_code": qr_payload,
            "qr_link": f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={qr_payload}",
            "expires_in_hours": 48
        }
