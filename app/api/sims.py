import uuid
from fastapi import APIRouter, Depends
from app.core.security import get_current_user, require_role
from app.core.response import success_response, error_response
from app.data.database import query_get, query_all, execute

router = APIRouter(prefix="/api/v1/sims", tags=["sims"])

@router.get("/me")
def get_my_sim(user: dict = Depends(get_current_user)):
    customer_id = user.get("customerId")
    if not customer_id:
        return error_response("Customer ID missing from auth session", 403)

    sim = query_get("SELECT * FROM sim_cards WHERE customer_id = ? LIMIT 1", (customer_id,))
    return success_response(sim)

@router.post("/convert-esim")
def convert_to_esim(user: dict = Depends(get_current_user)):
    customer_id = user.get("customerId")
    if not customer_id:
        return error_response("Customer ID missing from auth session", 403)

    execute("UPDATE sim_cards SET sim_type = 'ESIM' WHERE customer_id = ?", (customer_id,))

    qr_token = f"ESIM-LPA:1$smdp.telecomone.net${uuid.uuid4().hex.upper()}"
    return success_response({
        "message": "eSIM profile generated! Scan the QR code or enter activation code in device cellular settings.",
        "activationCode": qr_token,
        "eidStatus": "VERIFIED",
        "setupSteps": [
            "Open Settings -> Mobile Data -> Add eSIM",
            "Scan activation code on your device camera",
            "Restart device once signal bars appear"
        ]
    })

@router.post("/block")
def block_sim(user: dict = Depends(get_current_user)):
    customer_id = user.get("customerId")
    if not customer_id:
        return error_response("Customer ID missing from auth session", 403)

    execute("UPDATE sim_cards SET status = 'BLOCKED' WHERE customer_id = ?", (customer_id,))
    return success_response({
        "message": "SIM has been emergency blocked to protect your identity and OTPs. Visit any telecom center for a replacement SIM.",
        "status": "BLOCKED"
    })

@router.get("")
def list_all_sims(user: dict = Depends(require_role("ADMIN", "SUPPORT_AGENT"))):
    sims = query_all("""
        SELECT s.*, c.first_name, c.last_name, c.email
        FROM sim_cards s
        JOIN customer_profiles c ON s.customer_id = c.customer_id
        ORDER BY s.activated_at DESC
        LIMIT 50
    """)
    return success_response(sims)
