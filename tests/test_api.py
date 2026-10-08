import pytest
from starlette.testclient import TestClient
from app.main import app
from app.data.database import init_db
from app.data.seed import seed_database

@pytest.fixture(scope="module")
def client():
    init_db()
    seed_database(force=True)
    with TestClient(app) as c:
        yield c

class TestFastApiEndpoints:
    def test_health_check(self, client):
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["data"]["status"] == "healthy"
        assert data["error"] is None

    def test_customer_login_alice(self, client):
        res = client.post("/api/v1/auth/login", json={
            "email": "alice@example.com",
            "password": "password123"
        })
        assert res.status_code == 200
        data = res.json()
        assert "token" in data["data"]
        assert data["data"]["user"]["role"] == "CUSTOMER"
        assert data["data"]["user"]["customerId"] == "cust-1"

    def test_admin_login(self, client):
        res = client.post("/api/v1/auth/admin/login", json={
            "email": "admin@company.com",
            "password": "admin123"
        })
        assert res.status_code == 200
        data = res.json()
        assert "token" in data["data"]
        assert data["data"]["user"]["role"] == "ADMIN"

    def test_subscriptions_and_usage(self, client):
        login = client.post("/api/v1/auth/login", json={
            "email": "alice@example.com",
            "password": "password123"
        }).json()
        token = login["data"]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Subscriptions
        sub_res = client.get("/api/v1/subscriptions/me", headers=headers)
        assert sub_res.status_code == 200
        subs = sub_res.json()["data"]
        assert len(subs) > 0
        assert subs[0]["plan_name"] == "Unlimited 5G 799"

        # Usage
        usage_res = client.get("/api/v1/usage/me", headers=headers)
        assert usage_res.status_code == 200
        u = usage_res.json()["data"]
        assert u["data_remaining_gb"] == 7.4

    def test_recharge_flow(self, client):
        login = client.post("/api/v1/auth/login", json={
            "email": "alice@example.com",
            "password": "password123"
        }).json()
        token = login["data"]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Execute ₹49 recharge
        rch_res = client.post("/api/v1/recharges", json={
            "planId": "plan-booster-49",
            "paymentMethod": "UPI"
        }, headers=headers)
        assert rch_res.status_code == 201
        r = rch_res.json()["data"]
        assert r["amount"] == 49.0
        assert r["status"] == "SUCCESS"

        # Check history
        hist_res = client.get("/api/v1/recharges/me", headers=headers)
        assert hist_res.status_code == 200
        hist = hist_res.json()["data"]
        assert any(item["recharge_id"] == r["recharge_id"] for item in hist)

    def test_bills_and_payment(self, client):
        login = client.post("/api/v1/auth/login", json={
            "email": "alice@example.com",
            "password": "password123"
        }).json()
        token = login["data"]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        bills_res = client.get("/api/v1/bills/me", headers=headers)
        assert bills_res.status_code == 200
        bills = bills_res.json()["data"]
        assert len(bills) > 0
        assert "breakdown" in bills[0]

    def test_sim_and_esim_actions(self, client):
        login = client.post("/api/v1/auth/login", json={
            "email": "alice@example.com",
            "password": "password123"
        }).json()
        token = login["data"]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        sim_res = client.get("/api/v1/sims/me", headers=headers)
        assert sim_res.status_code == 200
        sim = sim_res.json()["data"]
        assert sim["status"] == "ACTIVE"

        # Convert to eSIM
        esim_res = client.post("/api/v1/sims/convert-esim", headers=headers)
        assert esim_res.status_code == 200
        esim = esim_res.json()["data"]
        assert "ESIM-LPA" in esim["activationCode"]

        # Emergency Block
        block_res = client.post("/api/v1/sims/block", headers=headers)
        assert block_res.status_code == 200
        assert block_res.json()["data"]["status"] == "BLOCKED"

    def test_network_outages(self, client):
        login = client.post("/api/v1/auth/login", json={
            "email": "alice@example.com",
            "password": "password123"
        }).json()
        token = login["data"]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        outages_res = client.get("/api/v1/network/outages?city=Chennai", headers=headers)
        assert outages_res.status_code == 200
        outages = outages_res.json()["data"]
        assert len(outages) > 0
        assert outages[0]["city"] == "Chennai"

    def test_admin_dashboard(self, client):
        login = client.post("/api/v1/auth/admin/login", json={
            "email": "admin@company.com",
            "password": "admin123"
        }).json()
        token = login["data"]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        dash_res = client.get("/api/v1/admin/dashboard", headers=headers)
        assert dash_res.status_code == 200
        dash = dash_res.json()["data"]
        assert dash["metrics"]["totalSubscribers"] >= 2
        assert dash["metrics"]["activePlans"] >= 6
        assert len(dash["activeOutagesList"]) >= 1

    def test_chat_ai_endpoint(self, client):
        login = client.post("/api/v1/auth/login", json={
            "email": "alice@example.com",
            "password": "password123"
        }).json()
        token = login["data"]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        chat_res = client.post("/api/v1/conversations/conv-test-api/messages", json={
            "content": "How much high speed 5G data do I have left?"
        }, headers=headers)
        assert chat_res.status_code == 200
        chat_data = chat_res.json()["data"]
        assert "message" in chat_data
        assert chat_data["intent"] == "DATA_USAGE"
        assert "7.4" in chat_data["message"] or "GB" in chat_data["message"]
