import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Optional
from app.core.security import verify_password, hash_password, create_access_token, get_current_user
from app.core.response import success_response, error_response
from app.data.database import query_get, execute

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    firstName: str
    lastName: Optional[str] = ""
    phone: Optional[str] = None
    city: Optional[str] = "Mumbai"

@router.post("/login")
def customer_login(req: LoginRequest):
    user = query_get("""
        SELECT u.user_id, u.email, u.password_hash, u.role, c.customer_id, c.first_name, c.last_name, c.customer_status
        FROM users u
        LEFT JOIN customer_profiles c ON u.user_id = c.user_id
        WHERE u.email = ? AND u.role = 'CUSTOMER'
    """, (req.email,))

    if not user or not verify_password(req.password, user["password_hash"]):
        return error_response("Invalid email or password", 401)

    if user.get("customer_status") == "SUSPENDED":
        return error_response("Your account has been suspended. Please contact support.", 403)

    token = create_access_token({
        "userId": user["user_id"],
        "email": user["email"],
        "role": "CUSTOMER",
        "customerId": user["customer_id"],
    })

    return success_response({
        "token": token,
        "user": {
            "userId": user["user_id"],
            "email": user["email"],
            "role": "CUSTOMER",
            "customerId": user["customer_id"],
            "firstName": user.get("first_name", "Subscriber"),
            "lastName": user.get("last_name", ""),
        }
    })

@router.post("/admin/login")
def admin_login(req: LoginRequest):
    user = query_get("""
        SELECT u.user_id, u.email, u.password_hash, u.role
        FROM users u
        WHERE u.email = ? AND u.role IN ('ADMIN', 'SUPPORT_AGENT')
    """, (req.email,))

    if not user or not verify_password(req.password, user["password_hash"]):
        return error_response("Invalid administrator credentials", 401)

    token = create_access_token({
        "userId": user["user_id"],
        "email": user["email"],
        "role": user["role"],
    })

    return success_response({
        "token": token,
        "user": {
            "userId": user["user_id"],
            "email": user["email"],
            "role": user["role"],
            "firstName": "Operations",
            "lastName": "Administrator" if user["role"] == "ADMIN" else "Agent",
        }
    })

@router.post("/register")
def register(req: RegisterRequest):
    existing = query_get("SELECT id FROM users WHERE email = ?", (req.email,))
    if existing:
        return error_response("An account with this email already exists", 409)

    now = datetime.now(timezone.utc).isoformat()
    user_id = f"usr-{uuid.uuid4().hex[:8]}"
    customer_id = f"cust-{uuid.uuid4().hex[:8]}"
    pwd_hash = hash_password(req.password)

    execute("""
        INSERT INTO users (user_id, email, password_hash, role, created_at)
        VALUES (?, ?, ?, 'CUSTOMER', ?)
    """, (user_id, req.email, pwd_hash, now))

    execute("""
        INSERT INTO customer_profiles (customer_id, user_id, first_name, last_name, email, phone_number, city, customer_status, customer_since)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    """, (customer_id, user_id, req.firstName, req.lastName, req.email, req.phone or "+91 98765 00000", req.city, now))

    token = create_access_token({
        "userId": user_id,
        "email": req.email,
        "role": "CUSTOMER",
        "customerId": customer_id,
    })

    return success_response({
        "token": token,
        "user": {
            "userId": user_id,
            "email": req.email,
            "role": "CUSTOMER",
            "customerId": customer_id,
            "firstName": req.firstName,
            "lastName": req.lastName,
        }
    }, 201)

@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    return success_response(user)
