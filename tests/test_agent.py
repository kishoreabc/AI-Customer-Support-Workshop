import pytest
import asyncio
from app.data.database import init_db, query_get, execute
from app.data.seed import seed_database
from app.agent.tool_executor import execute_tool
from app.agent.intent_router import classify_intent, detect_frustration, detect_human_request
from app.agent.troubleshooting import run_network_troubleshooting_workflow
from app.agent.orchestrator import process_telecom_message

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    seed_database(force=True)

class TestTelecomAgentSystem:
    def test_customer_isolation_on_recharge_status(self):
        # rch-2003 belongs to cust-2 (Bob)
        result = execute_tool(
            "get_recharge_status",
            {"transactionId": "rch-2003"},
            {
                "conversationId": "test-conv",
                "customerId": "cust-1",  # Alice
                "userRole": "CUSTOMER",
                "userId": "usr-cust-1"
            }
        )
        assert result["success"] is False
        assert "Security isolation" in result["error"]

    def test_rejects_customer_search_for_subscribers(self):
        result = execute_tool(
            "search_customer",
            {"query": "Bob"},
            {
                "conversationId": "test-conv",
                "customerId": "cust-1",
                "userRole": "CUSTOMER",
                "userId": "usr-cust-1"
            }
        )
        assert result["success"] is False
        assert "strictly prohibited" in result["error"]

    def test_get_active_plan_for_alice(self):
        result = execute_tool(
            "get_active_plan",
            {},
            {
                "conversationId": "test-conv",
                "customerId": "cust-1",
                "userRole": "CUSTOMER",
                "userId": "usr-cust-1"
            }
        )
        assert result["success"] is True
        assert result["data"]["plan_name"] == "Unlimited 5G 799"
        assert result["data"]["is_5g"] == 1

    def test_get_data_usage_for_alice(self):
        result = execute_tool(
            "get_data_usage",
            {},
            {
                "conversationId": "test-conv",
                "customerId": "cust-1",
                "userRole": "CUSTOMER",
                "userId": "usr-cust-1"
            }
        )
        assert result["success"] is True
        assert result["data"]["data_remaining_gb"] == 7.4
        assert result["data"]["isQuotaExhausted"] is False

    def test_check_network_outage_chennai(self):
        result = execute_tool(
            "check_network_outage",
            {"city": "Chennai"},
            {
                "conversationId": "test-conv",
                "customerId": "cust-2",
                "userRole": "CUSTOMER",
                "userId": "usr-cust-2"
            }
        )
        assert result["success"] is True
        assert result["data"]["outageFound"] is True
        assert result["data"]["activeOutages"][0]["city"] == "Chennai"
        assert result["data"]["activeOutages"][0]["severity"] == "MAJOR"

    def test_check_5g_coverage(self):
        result = execute_tool(
            "check_5g_coverage",
            {"location": "Mumbai"},
            {
                "conversationId": "test-conv",
                "customerId": "cust-1",
                "userRole": "CUSTOMER",
                "userId": "usr-cust-1"
            }
        )
        assert result["success"] is True
        assert result["data"]["coverage5GAvailable"] is True
        assert "True 5G" in result["data"]["technology"]

    def test_intent_classification(self):
        assert classify_intent("How much data do I have left?") == "DATA_USAGE"
        assert classify_intent("Is there a network outage in Chennai?") == "NETWORK_OUTAGE"
        assert classify_intent("I want to convert my physical SIM to eSIM") == "ESIM_SUPPORT"
        assert classify_intent("I want to speak with a human agent please") == "HUMAN_ESCALATION"
        assert classify_intent("What is the price of the 5G plan?") == "PLAN_QUERY"

    def test_frustration_detection(self):
        assert detect_frustration("Your network service is terrible, worst company ever!") is True
        assert detect_human_request("I demand to speak to a real person") is True
        assert detect_frustration("What is my current data quota?") is False

    def test_network_troubleshooting_workflow_for_normal_customer(self):
        diag = run_network_troubleshooting_workflow("cust-1", "Mumbai")
        assert diag["subscriberName"] == "Alice Sharma"
        assert diag["city"] == "Mumbai"
        assert diag["hasOutage"] is False
        assert diag["rootCause"] == "LOCAL_DEVICE_OR_SIGNAL_DRIFT"
        assert "Airplane Mode" in diag["suggestedAction"]

    def test_network_troubleshooting_workflow_for_outage_customer(self):
        diag = run_network_troubleshooting_workflow("cust-2", "Chennai")
        assert diag["city"] == "Chennai"
        assert diag["hasOutage"] is True
        assert diag["rootCause"] == "REGIONAL_NETWORK_OUTAGE"
        assert "Guindy" in diag["recommendation"] or "Chennai" in diag["recommendation"]

    @pytest.mark.anyio
    async def test_human_takeover_lock(self):
        conv_id = "test-conv-human-takeover"
        execute("""
            INSERT INTO conversations (conversation_id, customer_id, status, created_at, updated_at)
            VALUES (?, 'cust-1', 'AI_ACTIVE', datetime('now'), datetime('now'))
        """, (conv_id,))

        # 1. Customer asks for human
        resp1 = await process_telecom_message(
            conversation_id=conv_id,
            customer_id="cust-1",
            user_message="I demand to talk to a real person right now!"
        )
        assert resp1["escalated"] is True
        assert "escalate_to_human" in resp1["toolCallsExecuted"]

        # Verify conversation status is HUMAN_HANDOFF in db
        conv = query_get("SELECT status FROM conversations WHERE conversation_id = ?", (conv_id,))
        assert conv["status"] == "HUMAN_HANDOFF"

        # 2. Subsequent message must NOT trigger automated AI reply
        resp2 = await process_telecom_message(
            conversation_id=conv_id,
            customer_id="cust-1",
            user_message="Are you still there? Hello?"
        )
        assert resp2["escalated"] is True
        assert len(resp2["toolCallsExecuted"]) == 0
        assert "human support representative has taken over" in resp2["message"]
