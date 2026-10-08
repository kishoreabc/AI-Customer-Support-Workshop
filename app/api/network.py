import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from app.core.security import get_current_user, require_role
from app.core.response import success_response, error_response
from app.data.database import query_get, query_all, execute

router = APIRouter(prefix="/api/v1/network", tags=["network"])

class CreateOutageRequest(BaseModel):
    region: str
    city: str
    affectedService: str
    networkType: Optional[str] = "5G"
    severity: Optional[str] = "MAJOR"
    status: Optional[str] = "INVESTIGATING"
    estimatedResolution: str
    description: str

class UpdateOutageRequest(BaseModel):
    status: Optional[str] = None
    estimatedResolution: Optional[str] = None
    description: Optional[str] = None

@router.get("/outages")
def list_outages(
    city: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    sql = "SELECT * FROM network_outages WHERE 1=1"
    params = []

    if city:
        sql += " AND city LIKE ?"
        params.append(f"%{city}%")

    if user["role"] == "CUSTOMER":
        sql += " AND status != 'RESOLVED'"

    sql += " ORDER BY severity DESC, start_time DESC"
    outages = query_all(sql, tuple(params))
    return success_response(outages)

@router.post("/outages")
def create_outage(body: CreateOutageRequest, user: dict = Depends(require_role("ADMIN", "SUPPORT_AGENT"))):
    outage_id = f"OUT-{datetime.now().year}-{uuid.uuid4().int % 9000 + 1000}"
    now = datetime.now(timezone.utc).isoformat()

    execute("""
        INSERT INTO network_outages (
            outage_id, region, city, affected_service, network_type, severity, status,
            start_time, estimated_resolution, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        outage_id, body.region, body.city, body.affectedService, body.networkType,
        body.severity, body.status, now, body.estimatedResolution, body.description, now, now
    ))

    created = query_get("SELECT * FROM network_outages WHERE outage_id = ?", (outage_id,))
    return success_response(created, 201)

@router.put("/outages/{id}")
def update_outage(id: str, body: UpdateOutageRequest, user: dict = Depends(require_role("ADMIN", "SUPPORT_AGENT"))):
    outage = query_get("SELECT * FROM network_outages WHERE outage_id = ?", (id,))
    if not outage:
        return error_response("Outage record not found", 404)

    now = datetime.now(timezone.utc).isoformat()
    execute("""
        UPDATE network_outages SET
            status = ?, estimated_resolution = ?, description = ?, updated_at = ?
        WHERE outage_id = ?
    """, (
        body.status or outage["status"],
        body.estimatedResolution or outage["estimated_resolution"],
        body.description or outage["description"],
        now, id
    ))

    updated = query_get("SELECT * FROM network_outages WHERE outage_id = ?", (id,))
    return success_response(updated)

@router.get("/coverage")
def check_coverage(location: Optional[str] = Query("Mumbai"), user: dict = Depends(get_current_user)):
    return success_response({
        "location": location,
        "is5GCovered": True,
        "bands": ["n28", "n78", "n258"],
        "averageDownloadSpeed": "640 Mbps",
        "averageUploadSpeed": "85 Mbps",
        "technology": "True 5G Standalone (SA)"
    })
