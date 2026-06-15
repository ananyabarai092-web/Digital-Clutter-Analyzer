from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from server.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_user,
    get_current_user,
    public_user,
)
from server.services.database import get_collection, utcnow
from server.services.monitoring_service import save_monitoring_settings

router = APIRouter(tags=["Auth"])


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("Enter a valid email address")
        return value.strip().lower()


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class SettingsRequest(BaseModel):
    notifications: bool = True
    auto_cleanup: bool = False
    deep_security_scan: bool = True
    folder_monitoring: bool = False
    scan_directory: str = ""


def _auth_response(user: Dict[str, Any]) -> Dict[str, Any]:
    token = create_access_token(user)
    return {"access_token": token, "token_type": "bearer", "user": public_user(user)}


@router.post("/register")
@router.post("/api/register")
async def register(request: RegisterRequest) -> Dict[str, Any]:
    user = create_user(request.full_name, request.email, request.password)
    return _auth_response(user)


@router.post("/login")
@router.post("/api/login")
async def login(request: LoginRequest) -> Dict[str, Any]:
    user = authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return _auth_response(user)


@router.get("/profile")
@router.get("/api/profile")
async def profile(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return public_user(user)


@router.put("/api/settings")
async def update_settings(request: SettingsRequest, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    settings = request.model_dump()
    get_collection("users").update_one(
        {"email": user["email"]},
        {"$set": {"settings": settings, "updated_at": utcnow()}},
    )
    save_monitoring_settings(str(user["_id"]), settings["folder_monitoring"], settings["scan_directory"])
    user["settings"] = settings
    return public_user(user)
