"""Who is signed in to the dashboard? Always verifies the Firebase token, whatever the switches say."""
from fastapi import APIRouter, Request

from app.security import admin_from_request

router = APIRouter(tags=["Admin Session"])


@router.get("/admin/me")
@router.get("/api/v1/admin/me")
def admin_me(request: Request):
    admin = admin_from_request(request)
    return {"email": admin.email, "name": admin.display, "role": "admin"}
