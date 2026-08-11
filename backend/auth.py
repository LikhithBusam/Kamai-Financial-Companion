"""
Verifies Supabase-issued JWTs so backend endpoints can trust the caller's
identity instead of a client-supplied user_id (closes the IDOR hole where
any caller could request analysis or read logs for any user).
"""

import os

import jwt
from fastapi import Header, HTTPException


def get_current_user_id(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ")
    secret = os.environ["SUPABASE_JWT_SECRET"]

    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload["sub"]
