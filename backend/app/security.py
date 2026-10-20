"""
Authentication for the TraceHarvest API.

Two kinds of callers, two kinds of tokens:

* Dashboard administrators sign in with Firebase (Google). The dashboard sends the
  Firebase ID token as `Authorization: Bearer <token>`. The server verifies it against
  Google's published signing keys and then checks the e-mail address against ADMIN_EMAILS.
* Field agents sign in with e-mail + password and receive a TraceHarvest session token
  (HS256, role "agent", sub = agent ID).

Rollout is controlled by two switches, read on every request:

  REQUIRE_ADMIN_AUTH   "true" -> admin routes need a valid admin token. Default off.
  REQUIRE_AGENT_AUTH   "true" -> field-agent writes (sync, direct enrolment) need the
                                 agent's own token. Default off.

While a switch is off nothing is blocked, but valid tokens are still recognised (so the
reviewer name on an approval is the real signed-in admin as soon as the dashboard sends it).

Environment variables
  FIREBASE_PROJECT_ID  Firebase project the dashboard signs in with.
  ADMIN_EMAILS         Comma-separated e-mail addresses allowed to administer.
                       Empty means NOBODY is an admin (fail closed).
"""
import logging
import os
import time
from dataclasses import dataclass
from typing import Optional

import requests
from cryptography import x509
from cryptography.hazmat.primitives import serialization
from fastapi import Request
from fastapi.responses import JSONResponse
from jose import ExpiredSignatureError, JWTError, jwt

from app.config import settings

log = logging.getLogger("traceharvest.security")

GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
_CERT_CACHE = {"certs": {}, "expires": 0.0, "fetched": 0.0}


# ----------------------------------------------------------------------------
# One error type, one response shape: {"error": "CODE", "message": "..."}
# ----------------------------------------------------------------------------
class ApiError(Exception):
    def __init__(self, status_code: int, code: str, message: str, **extra):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.extra = extra


async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.code, "message": exc.message, **exc.extra},
    )


# ----------------------------------------------------------------------------
# Switches and configuration (read per request so a Vercel env change needs only a redeploy)
# ----------------------------------------------------------------------------
def flag(name: str) -> bool:
    return os.getenv(name, "false").strip().lower() in ("1", "true", "yes", "on")


def admin_emails() -> set:
    return {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()}


def firebase_project_id() -> str:
    return os.getenv("FIREBASE_PROJECT_ID", "").strip()


def bearer_token(request: Request) -> Optional[str]:
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer ") and header[7:].strip():
        return header[7:].strip()
    return None


# ----------------------------------------------------------------------------
# Firebase ID token verification (administrators)
# ----------------------------------------------------------------------------
def fetch_google_certs():
    """Returns ({kid: PEM certificate}, seconds-to-live). Replaced in tests."""
    try:
        resp = requests.get(GOOGLE_CERTS_URL, timeout=5)
        resp.raise_for_status()
    except Exception as exc:  # network failure, Google outage
        log.warning("Could not fetch Google signing keys: %s", exc)
        raise ApiError(503, "AUTH_UNAVAILABLE", "Sign-in verification is temporarily unavailable. Please retry.")
    max_age = 3600
    for part in resp.headers.get("cache-control", "").split(","):
        part = part.strip()
        if part.startswith("max-age="):
            try:
                max_age = int(part.split("=", 1)[1])
            except ValueError:
                pass
    return resp.json(), max_age


def _signing_key_pem(kid: str) -> Optional[str]:
    now = time.time()
    stale = now >= _CERT_CACHE["expires"]
    # Refetch when expired, or (at most once a minute) when Google has rotated to an unknown key
    if stale or (kid not in _CERT_CACHE["certs"] and now - _CERT_CACHE["fetched"] > 60):
        certs, ttl = fetch_google_certs()
        _CERT_CACHE.update(certs=certs, expires=now + ttl, fetched=now)
    cert_pem = _CERT_CACHE["certs"].get(kid)
    if not cert_pem:
        return None
    public_key = x509.load_pem_x509_certificate(cert_pem.encode()).public_key()
    return public_key.public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()


def verify_firebase_token(token: str) -> dict:
    project = firebase_project_id()
    if not project:
        raise ApiError(503, "AUTH_NOT_CONFIGURED", "Administrator sign-in is not configured on the server.")
    try:
        header = jwt.get_unverified_header(token)
    except JWTError:
        raise ApiError(401, "UNAUTHENTICATED", "Invalid sign-in token.")
    if header.get("alg") != "RS256" or not header.get("kid"):
        raise ApiError(401, "UNAUTHENTICATED", "Invalid sign-in token.")

    key_pem = _signing_key_pem(header["kid"])
    if not key_pem:
        raise ApiError(401, "UNAUTHENTICATED", "Invalid sign-in token.")
    try:
        claims = jwt.decode(
            token, key_pem, algorithms=["RS256"],
            audience=project, issuer=f"https://securetoken.google.com/{project}",
        )
    except ExpiredSignatureError:
        raise ApiError(401, "TOKEN_EXPIRED", "Your session has expired. Please sign in again.")
    except JWTError:
        raise ApiError(401, "UNAUTHENTICATED", "Invalid sign-in token.")
    if not claims.get("sub"):
        raise ApiError(401, "UNAUTHENTICATED", "Invalid sign-in token.")
    return claims


@dataclass
class AdminIdentity:
    email: str
    name: str
    authenticated: bool

    @property
    def display(self) -> str:
        return self.name or self.email


def admin_from_request(request: Request) -> AdminIdentity:
    """Strict: a valid Firebase token belonging to an allowed administrator, or ApiError."""
    token = bearer_token(request)
    if not token:
        raise ApiError(401, "UNAUTHENTICATED", "Sign in to continue.")
    claims = verify_firebase_token(token)
    email = (claims.get("email") or "").strip().lower()
    if not email or claims.get("email_verified") is not True:
        raise ApiError(403, "NOT_AN_ADMIN", "This account's e-mail address is not verified.")
    if email not in admin_emails():
        raise ApiError(403, "NOT_AN_ADMIN", "This account is not authorized as an administrator.")
    return AdminIdentity(email=email, name=(claims.get("name") or email), authenticated=True)


def require_admin(request: Request) -> AdminIdentity:
    """FastAPI dependency for dashboard routes."""
    if flag("REQUIRE_ADMIN_AUTH"):
        return admin_from_request(request)
    # Not enforcing yet: recognise a valid admin if one is present, but never block.
    if bearer_token(request) and firebase_project_id():
        try:
            return admin_from_request(request)
        except ApiError:
            pass
    return AdminIdentity(email="", name="", authenticated=False)


# ----------------------------------------------------------------------------
# Field-agent session tokens
# ----------------------------------------------------------------------------
def agent_claims(request: Request) -> dict:
    """Strict: a valid, unexpired agent session token, or ApiError."""
    token = bearer_token(request)
    if not token:
        raise ApiError(401, "UNAUTHENTICATED", "Sign in to continue.")
    try:
        claims = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except ExpiredSignatureError:
        raise ApiError(401, "TOKEN_EXPIRED", "Your session has expired. Please sign in again.")
    except JWTError:
        raise ApiError(401, "UNAUTHENTICATED", "Invalid session. Please sign in again.")
    if claims.get("role") != "agent" or not claims.get("sub"):
        raise ApiError(401, "UNAUTHENTICATED", "This session is not a field agent session.")
    if claims.get("type") == "refresh":
        # Refresh tokens only renew sessions (POST /auth/refresh); they are never valid for API calls.
        raise ApiError(401, "UNAUTHENTICATED", "Invalid session. Please sign in again.")
    return claims


def enforce_agent_token(request: Request, agent_id: Optional[str]) -> Optional[str]:
    """
    With REQUIRE_AGENT_AUTH on: the caller must hold an agent token, and agent_id (if the
    request names one) must be that agent. Returns the token's agent ID, or None when the
    switch is off.
    """
    if not flag("REQUIRE_AGENT_AUTH"):
        return None
    claims = agent_claims(request)
    if agent_id and agent_id != claims["sub"]:
        raise ApiError(403, "AGENT_ID_MISMATCH", "This session belongs to a different field agent.")
    return claims["sub"]


def allow_agent_status_read(request: Request, agent_id: str) -> None:
    """Sync-status lookups: the agent themself, or an administrator."""
    if not (flag("REQUIRE_AGENT_AUTH") or flag("REQUIRE_ADMIN_AUTH")):
        return
    try:
        claims = agent_claims(request)
        if claims["sub"] == agent_id:
            return
        raise ApiError(403, "AGENT_ID_MISMATCH", "This session belongs to a different field agent.")
    except ApiError as agent_error:
        try:
            admin_from_request(request)
            return
        except ApiError:
            raise agent_error
