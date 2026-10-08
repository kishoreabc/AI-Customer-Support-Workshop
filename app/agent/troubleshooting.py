from typing import Dict, Any, List
from app.agent.tool_executor import execute_tool

def run_network_troubleshooting_workflow(customer_id: str, city: str = "Mumbai") -> Dict[str, Any]:
    """
    Automated multi-step diagnostic workflow:
    1. Identify subscriber profile
    2. Check active plan & 5G capability
    3. Check real-time daily data balance
    4. Check regional cell tower health & active outages
    5. Check SIM card status
    6. Formulate definitive diagnosis and actionable resolution
    """
    ctx = {
        "customerId": customer_id,
        "userRole": "CUSTOMER",
        "userId": f"usr-{customer_id}",
    }

    # Step 1: Customer Profile
    profile_res = execute_tool("get_customer_profile", {}, ctx)
    subscriber_name = "Subscriber"
    user_city = city
    if profile_res.get("success") and profile_res.get("data"):
        d = profile_res["data"]
        subscriber_name = f"{d.get('first_name', '')} {d.get('last_name', '')}".strip()
        user_city = d.get("city") or city

    # Step 2: Active Plan
    plan_res = execute_tool("get_active_plan", {}, ctx)
    has_active_plan = False
    plan_name = "None"
    is_5g = False
    if plan_res.get("success") and plan_res.get("data"):
        p = plan_res["data"]
        if p.get("plan_id"):
            has_active_plan = True
            plan_name = p.get("plan_name", "Active Plan")
            is_5g = bool(p.get("is_5g", 1))

    # Step 3: Data Quota
    usage_res = execute_tool("get_data_usage", {}, ctx)
    data_remaining_gb = 5.0
    is_quota_exhausted = False
    if usage_res.get("success") and usage_res.get("data"):
        u = usage_res["data"]
        data_remaining_gb = u.get("data_remaining_gb", 5.0)
        is_quota_exhausted = bool(u.get("isQuotaExhausted", False))

    # Step 4: Network Outage
    outage_res = execute_tool("check_network_outage", {"city": user_city}, ctx)
    has_outage = False
    outage_details = None
    if outage_res.get("success") and outage_res.get("data"):
        has_outage = bool(outage_res["data"].get("outageFound", False))
        if has_outage:
            outage_details = outage_res["data"].get("activeOutages", [{}])[0]

    # Step 5: SIM Status
    sim_res = execute_tool("check_sim_status", {}, ctx)
    sim_active = True
    sim_status = "ACTIVE"
    if sim_res.get("success") and sim_res.get("data"):
        sim_status = sim_res["data"].get("status", "ACTIVE")
        sim_active = sim_status == "ACTIVE"

    # Step 6: Formulate Diagnosis
    diagnostic_steps: List[str] = []
    root_cause = "NORMAL"
    recommendation = ""
    suggested_action = ""

    if not sim_active:
        root_cause = "SIM_SUSPENDED_OR_BLOCKED"
        recommendation = f"Your SIM card is currently in {sim_status} state. Mobile network service is deactivated."
        suggested_action = "Unblock SIM in portal or contact customer supportdesk."
    elif not has_active_plan:
        root_cause = "NO_ACTIVE_SUBSCRIPTION"
        recommendation = "Your tariff plan validity has expired. No active data pack registered."
        suggested_action = "Recharge your number with a 5G plan to restore high-speed internet."
    elif is_quota_exhausted:
        root_cause = "DATA_QUOTA_EXHAUSTED"
        recommendation = f"Your daily high-speed quota is exhausted ({data_remaining_gb} GB remaining). Speed is capped at 64 Kbps."
        suggested_action = "Add a ₹49 6GB instant Data Booster pack to resume full 5G speeds immediately."
    elif has_outage and outage_details:
        root_cause = "REGIONAL_NETWORK_OUTAGE"
        recommendation = f"Active {outage_details.get('severity', 'MAJOR')} network incident detected in {user_city}: {outage_details.get('description', '')}. Estimated resolution: {outage_details.get('estimated_resolution', 'in progress')}."
        suggested_action = "Our field engineering crews are actively repairing the cell tower node."
    else:
        root_cause = "LOCAL_DEVICE_OR_SIGNAL_DRIFT"
        recommendation = f"Cell towers in {user_city} are fully operational (99.9% uptime). Your 5G plan '{plan_name}' has {data_remaining_gb} GB remaining."
        suggested_action = "Perform guided local device reset: 1) Toggle Airplane Mode ON for 10 seconds and turn OFF. 2) Check APN is set to 'telecom.5g.net'. 3) Ensure 5G Auto is toggled in Cellular settings."

    return {
        "subscriberName": subscriber_name,
        "city": user_city,
        "planName": plan_name,
        "dataRemainingGb": data_remaining_gb,
        "hasOutage": has_outage,
        "rootCause": root_cause,
        "recommendation": recommendation,
        "suggestedAction": suggested_action,
        "is5GEligible": is_5g,
        "simStatus": sim_status,
    }
