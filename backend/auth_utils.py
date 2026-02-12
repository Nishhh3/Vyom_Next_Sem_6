from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import uuid
from fastapi import Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

import db


# NOTE:
# In production, keep this key in environment/config, not in code.
SECRET_KEY = "CHANGE_ME_TO_A_LONG_RANDOM_SECRET_KEY"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7


http_bearer = HTTPBearer(auto_error=False)


def _create_token(
    data: Dict[str, Any],
    expires_delta: timedelta,
    token_type: str,
) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": token_type,
        }
    )
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(user: Dict[str, Any]) -> str:
    """
    Create a short-lived access token for the given user.
    """
    user_id = user.get("user_id")
    if not user_id:
        raise ValueError("user_id missing on user object")

    payload = {
        "sub": user_id,
        "role": (user.get("role") or "user"),
    }
    return _create_token(
        data=payload,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        token_type="access",
    )


def create_refresh_token(user: Dict[str, Any]) -> str:
    """
    Create a long-lived refresh token and persist it for rotation/logout.
    """
    user_id = user.get("user_id")
    if not user_id:
        raise ValueError("user_id missing on user object")

    jti = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "jti": jti,
    }
    token = _create_token(
        data=payload,
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        token_type="refresh",
    )

    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    db.store_refresh_token(user_id=user_id, jti=jti, token=token, expires_at=expires_at)

    return token


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """
    Store refresh token in HTTP-only secure cookie.
    """
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,  # in dev you may relax this if needed
        samesite="lax",
        path="/",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie("refresh_token", path="/")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
) -> Dict[str, Any]:
    """
    Dependency:
    - Reads Bearer access token
    - Verifies signature, expiry, type
    - Loads user from DB
    - Re-checks status/is_active
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = db.get_user_by_userid(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    status_value = (user.get("status") or "").upper()
    if status_value not in ("ACCEPTED", "APPROVED"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account not activated (status: {user.get('status')})",
        )

    is_active = user.get("is_active")
    if is_active is not None and not bool(is_active):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    return user


async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Role-based dependency. Assumes a 'role' field on the user row.
    """
    role = (current_user.get("role") or "user").lower()
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


async def refresh_access_token(request: Request, response: Response) -> Dict[str, Any]:
    """
    Refresh endpoint logic with rotation.
    - Reads refresh token from cookie
    - Validates + checks DB
    - Rotates to new refresh token
    - Returns new access token
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        user_id: Optional[str] = payload.get("sub")
        jti: Optional[str] = payload.get("jti")
        if not user_id or not jti:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    stored = db.get_refresh_token(jti=jti)
    if (
        not stored
        or stored.get("revoked")
        or stored.get("token") != refresh_token
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is not valid",
        )

    expires_at = stored.get("expires_at")
    if isinstance(expires_at, datetime) and expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
        )

    user = db.get_user_by_userid(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Rotate refresh token
    db.revoke_refresh_token(jti=jti)
    new_refresh = create_refresh_token(user)
    set_refresh_cookie(response, new_refresh)

    new_access = create_access_token(user)
    return {"access_token": new_access, "token_type": "bearer"}


async def logout(request: Request, response: Response) -> Dict[str, Any]:
    """
    Logout:
    - Revokes the current refresh token (if present)
    - Clears cookie
    """
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        try:
            payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            jti: Optional[str] = payload.get("jti")
            user_id: Optional[str] = payload.get("sub")
            if jti:
                db.revoke_refresh_token(jti=jti)
            if user_id:
                # Optionally revoke all tokens for this user
                db.revoke_user_refresh_tokens(user_id=user_id)
        except JWTError:
            # Even if invalid, we just clear the cookie
            pass

    clear_refresh_cookie(response)
    return {"success": True}

