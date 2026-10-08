import unittest
from fastapi.testclient import TestClient
from main import app
from app.agent.graph import telecom_agent
from app.data.database import customer_db
from app.data.tickets import ticket_store

class TestTelecomAgentPipeline(unittest.TestCase):
    def setUp(self):
        customer_db.reset()
        ticket_store.reset()
        self.client = TestClient(app)

    def test_fiber_los_auto_resolve(self):
        """Test Fiber ONT red light scenario: should trigger automated OLT port reset."""
        payload = {
            "customer_id": "CUST-102",
            "message": "My fiber box has a solid red light and internet is down."
        }
        res = self.client.post("/api/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        self.assertEqual(data["classification"]["category"], "NETWORK_ISSUE")
        self.assertEqual(data["decision"]["action_type"], "AUTO_RESOLVE")
        self.assertIn("reset_network_port", data["decision"]["action_details"]["action_name"])
        self.assertIn("Nokia Fiber ONT", data["response"])
        self.assertTrue(len(data["trace"]) >= 5)

    def test_roaming_charge_waiver(self):
        """Test Roaming dispute scenario: should apply automated courtesy waiver."""
        payload = {
            "customer_id": "CUST-103",
            "message": "I want to dispute the $65 roaming fee from my Mexico trip."
        }
        res = self.client.post("/api/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        self.assertEqual(data["classification"]["category"], "BILLING_QUERY")
        self.assertEqual(data["decision"]["action_type"], "AUTO_RESOLVE")
        self.assertIn("courtesy credit", data["response"].lower())

    def test_esim_profile_generation(self):
        """Test eSIM setup scenario: should generate cryptographic profile & QR code."""
        payload = {
            "customer_id": "CUST-104",
            "message": "I need to activate an eSIM on my new Pixel phone, send me the QR code."
        }
        res = self.client.post("/api/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        self.assertEqual(data["classification"]["category"], "ACCOUNT_MANAGEMENT")
        self.assertEqual(data["decision"]["action_type"], "AUTO_RESOLVE")
        self.assertIn("eSIM", data["response"])
        self.assertIn("smdp.telco-cloud.net", data["response"])

    def test_enterprise_bgp_human_escalation(self):
        """Test Enterprise BGP failure: must trigger P1 ticket handover to NOC."""
        payload = {
            "customer_id": "CUST-105",
            "message": "Our enterprise leased line 10Gbps circuit is having BGP flaps and high packet loss."
        }
        res = self.client.post("/api/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        self.assertEqual(data["decision"]["action_type"], "HUMAN_SUPPORT")
        self.assertIsNotNone(data["ticket"])
        self.assertEqual(data["ticket"]["priority"], "P1")
        self.assertEqual(data["ticket"]["assigned_queue"], "NOC_TIER3_ENTERPRISE")
        self.assertIn(data["ticket"]["ticket_id"], data["response"])

    def test_api_endpoints(self):
        """Test customer list, ticket list, and graph metadata endpoints."""
        customers_res = self.client.get("/api/customers")
        self.assertEqual(customers_res.status_code, 200)
        self.assertTrue(len(customers_res.json()) >= 5)

        graph_res = self.client.get("/api/graph")
        self.assertEqual(graph_res.status_code, 200)
        self.assertIn("nodes", graph_res.json())
        self.assertIn("edges", graph_res.json())

        status_res = self.client.get("/api/status")
        self.assertEqual(status_res.status_code, 200)
        self.assertEqual(status_res.json()["status"], "ONLINE")

if __name__ == "__main__":
    unittest.main()
