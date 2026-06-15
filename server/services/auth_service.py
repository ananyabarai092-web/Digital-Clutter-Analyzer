import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from server.services.database import ObjectId, get_collection, serialize_doc, utcnow

logger = logging.getLogger(__name__)

try:
    from jose import jwt
except Exception:  # pragma: no cover
    jwt = None

# Try to import bcrypt directly (most reliable approach)
try:
    import bcrypt as _bcrypt
    HAS_BCRYPT = True
    logger.info("auth_service: using direct bcrypt module")
except ImportError:
    _bcrypt = None
    HAS_BCRYPT = False
    logger.warning("auth_service: bcrypt module not available, trying passlib")

# Fall back to passlib if direct bcrypt is not available
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    HAS_PASSLIB = True
    logger.info("auth_service: using passlib for bcrypt")
except Exception:
    pwd_context = None
    HAS_PASSLIB = False
    logger.warning("auth_service: passlib not available, using pbkdf2 fallback")


JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret-before-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "30"))
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt (preferred), with pbkdf2 fallback."""
    if HAS_BCRYPT:
        salt = _bcrypt.gensalt()
        hashed = _bcrypt.hashpw(password.encode("utf-8"), salt)
        logger.info("Password hashed successfully using direct bcrypt")
        return hashed.decode("utf-8")
    if pwd_context:
        result = pwd_context.hash(password)
        logger.info("Password hashed successfully using passlib/bcrypt")
        return result
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120000).hex()
    logger.info("Password hashed successfully using pbkdf2 fallback")
    return f"pbkdf2${salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against a stored hash. Supports bcrypt and pbkdf2 formats."""
    if not password_hash:
        logger.warning("Password verification failed: no stored hash found")
        return False

    # Try direct bcrypt verification (handles $2b$, $2a$, $2y$ prefixes)
    if password_hash.startswith(("$2b$", "$2a$", "$2y$")):
        logger.info("Detected bcrypt hash format")
        if HAS_BCRYPT:
            try:
                result = _bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
                logger.info(f"Password verification result (direct bcrypt): {result}")
                return result
            except Exception as e:
                logger.error(f"Direct bcrypt verification error: {e}")
        if pwd_context:
            try:
                result = pwd_context.verify(password, password_hash)
                logger.info(f"Password verification result (passlib): {result}")
                return result
            except Exception as e:
                logger.error(f"Passlib verification error: {e}")
                return False
        logger.warning("No bcrypt implementation available to verify hash")
        return False

    # Try pbkdf2 verification
    if password_hash.startswith("pbkdf2$"):
        logger.info("Detected pbkdf2 hash format")
        try:
            _, salt, digest = password_hash.split("$", 2)
            candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120000).hex()
            result = hmac.compare_digest(candidate, digest)
            logger.info(f"Password verification result (pbkdf2): {result}")
            return result
        except Exception as e:
            logger.error(f"Pbkdf2 verification error: {e}")
            return False

    # Last resort: try passlib for any unknown hash format
    logger.warning(f"Unknown password hash format, trying passlib fallback. Hash starts with: {password_hash[:20]}...")
    if pwd_context:
        try:
            result = pwd_context.verify(password, password_hash)
            logger.info(f"Password verification result (passlib fallback): {result}")
            return result
        except Exception as e:
            logger.error(f"Passlib fallback verification error: {e}")
            return False

    logger.error("Password verification failed: unable to handle hash format")
    return False


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _fallback_jwt_encode(payload: Dict[str, Any]) -> str:
    header = _b64(json.dumps({"typ": "JWT", "alg": JWT_ALGORITHM}).encode())
    body = _b64(json.dumps(payload, default=str).encode())
    signature = hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
    return f"{header}.{body}.{_b64(signature)}"


def _fallback_jwt_decode(token: str) -> Dict[str, Any]:
    try:
        header, body, signature = token.split(".")
        expected = _b64(hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Bad signature")
        padded = body + "=" * (-len(body) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode()))
        if payload.get("exp") and datetime.utcnow().timestamp() > float(payload["exp"]):
            raise ValueError("Expired token")
        return payload
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


def create_access_token(user: Dict[str, Any]) -> str:
    expires = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user["_id"]), "email": user["email"], "exp": expires.timestamp()}
    if jwt:
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return _fallback_jwt_encode(payload)


def decode_token(token: str) -> Dict[str, Any]:
    if jwt:
        try:
            return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    return _fallback_jwt_decode(token)


def create_user(full_name: str, email: str, password: str) -> Dict[str, Any]:
    users = get_collection("users")
    normalized = email.strip().lower()
    logger.info(f"Register: checking if user exists with email: {normalized}")
    existing = users.find_one({"email": normalized})
    if existing:
        logger.warning(f"Register: user already found with email: {normalized}")
        raise HTTPException(status_code=409, detail="Email is already registered")
    logger.info(f"Register: user not found, proceeding with registration for: {normalized}")

    password_hash = hash_password(password)
    logger.info(f"Register: password hashed successfully for: {normalized}")

    user = {
        "full_name": full_name.strip(),
        "email": normalized,
        "password_hash": password_hash,
        "settings": {
            "notifications": True,
            "auto_cleanup": False,
            "deep_security_scan": True,
            "folder_monitoring": False,
            "scan_directory": "",
        },
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    inserted = users.insert_one(user)
    user["_id"] = inserted.inserted_id
    logger.info(f"Register: user saved successfully for: {normalized}")
    return user


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    normalized = email.strip().lower()
    logger.info(f"Login: looking up user with email: {normalized}")
    user = get_collection("users").find_one({"email": normalized})
    if not user:
        logger.warning(f"Login: user not found with email: {normalized}")
        return None

    logger.info(f"Login: user found with email: {normalized}")
    stored_hash = user.get("password_hash", "")
    if not stored_hash:
        logger.warning(f"Login: no password_hash field found for user: {normalized}")
        return None

    logger.info(f"Login: stored hash exists (type: {stored_hash[:20]}...) for user: {normalized}")
    is_valid = verify_password(password, stored_hash)
    logger.info(f"Login: password verification result: {is_valid} for user: {normalized}")

    if not is_valid:
        return None

    get_collection("users").update_one({"email": user["email"]}, {"$set": {"last_login_at": utcnow()}})
    logger.info(f"Login: authentication successful for user: {normalized}")
    return user


def public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    clean = serialize_doc(user) or {}
    clean.pop("password_hash", None)
    return clean


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    users = get_collection("users")
    user = None
    if user_id:
        user = users.find_one({"_id": user_id})
        if not user and ObjectId:
            try:
                user = users.find_one({"_id": ObjectId(user_id)})
            except Exception:
                user = None
    if not user:
        user = users.find_one({"email": payload.get("email", "").lower()})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user