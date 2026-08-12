"""
Verifies Supabase-issued JWTs so backend endpoints can trust the caller's
identity instead of a client-supplied user_id (closes the IDOR hole where
any caller could request analysis or read logs for any user).

Confirmed live against the real project: tokens are signed ES256 (Supabase's
newer asymmetric signing-key system), not the legacy HS256 shared secret --
an earlier version of this file that only tried HS256 rejected every real
token as "invalid". Verification now fetches Supabase's public JWKS
(no secret needed for the primary path) and falls back to the HS256 shared
secret only if the token's key id isn't in the JWKS response, so this keeps
working for Supabase projects still on the legacy HS256 setup too.
"""

import os
from typing import Optional

import jwt
from fastapi import Header, HTTPException

_jwks_client: Optional[jwt.PyJWKClient] = None


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{os.environ['SUPABASE_URL']}/auth/v1/.well-known/jwks.json"
        _jwks_client = jwt.PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    # authorization must be Optional with a None default -- Header(...)
    # (required) makes FastAPI reject a missing header at the request-
    # validation layer with a 422 before this function body ever runs,
    # which bypasses the 401 a real client is checking for.
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ")

    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token, signing_key.key, algorithms=["ES256", "RS256"], audience="authenticated"
        )
    except jwt.PyJWKClientError:
        # Key id not found in the JWKS -- project is on the legacy HS256
        # shared-secret setup instead of asymmetric signing keys.
        try:
            payload = jwt.decode(
                token, os.environ["SUPABASE_JWT_SECRET"], algorithms=["HS256"], audience="authenticated"
            )
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload["sub"]
