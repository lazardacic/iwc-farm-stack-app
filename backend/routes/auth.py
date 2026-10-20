from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorCollection

from config import COOKIE_SECURE, REFRESH_TOKEN_EXPIRE_DAYS
from database.dependencies import get_refresh_token_collection, get_user_collection
from models.user import (
    TokenResponse,
    UserLogin,
    UserRegister,
    PUBLISHER_ROLES,
    UserResponse,
    normalize_role,
)
from security import create_access_token, decode_access_token, hash_password, verify_password
from services.refresh_tokens import (
    RefreshTokenError,
    issue_refresh_token,
    revoke_refresh_token,
    rotate_refresh_token,
)


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


UserCollection = Annotated[
    AsyncIOMotorCollection,
    Depends(get_user_collection),
]

RefreshTokenCollection = Annotated[
    AsyncIOMotorCollection,
    Depends(get_refresh_token_collection),
]

REFRESH_COOKIE_NAME = "refresh_token"


def refresh_cookie_path(request: Request) -> str:
    # Behind Nginx the browser sees /api/auth; root_path carries that prefix.
    return f"{request.scope.get('root_path', '').rstrip('/')}/auth"


def set_refresh_cookie(response: Response, request: Request, token: str):
    # httpOnly keeps the token away from JavaScript; SameSite=Lax stops other
    # sites from sending it with cross-site POSTs, which covers CSRF here.
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        token,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path=refresh_cookie_path(request),
    )


def clear_refresh_cookie(response: Response, request: Request):
    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path=refresh_cookie_path(request),
    )


def unauthorized_without_cookie(request: Request, detail: str) -> JSONResponse:
    # A raised HTTPException would drop cookie changes, so build the response here.
    response = JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": detail},
    )
    clear_refresh_cookie(response, request)
    return response


async def get_current_user(
    request: Request,
    collection: UserCollection,
) -> UserResponse:
    authorization = request.headers.get("authorization")

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    try:
        user_id = decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    try:
        object_id = ObjectId(user_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        ) from exc

    user = await collection.find_one({"_id": object_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        role=normalize_role(user.get("role")),
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_user(
    user: UserRegister,
    collection: UserCollection,
):
    email = user.email.lower()

    existing_user = await collection.find_one({"email": email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user_payload = {
        "email": email,
        "password_hash": hash_password(user.password),
        "role": "subscriber",
    }

    result = await collection.insert_one(user_payload)
    stored_user = await collection.find_one({"_id": result.inserted_id})

    return UserResponse(
        id=str(stored_user["_id"]),
        email=stored_user["email"],
        role=stored_user["role"],
    )


@router.post(
    "/login",
    response_model=TokenResponse,
)
async def login_user(
    payload: UserLogin,
    request: Request,
    response: Response,
    collection: UserCollection,
    refresh_tokens: RefreshTokenCollection,
):
    email = payload.email.lower()
    user = await collection.find_one({"email": email})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user_id = str(user["_id"])
    refresh_token = await issue_refresh_token(refresh_tokens, user_id)
    set_refresh_cookie(response, request, refresh_token)

    return TokenResponse(
        access_token=create_access_token(user_id),
        token_type="bearer",
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
)
async def refresh_access_token(
    request: Request,
    response: Response,
    users: UserCollection,
    refresh_tokens: RefreshTokenCollection,
):
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token:
        return unauthorized_without_cookie(request, "Missing refresh token")

    try:
        result = await rotate_refresh_token(refresh_tokens, token)
    except RefreshTokenError as exc:
        return unauthorized_without_cookie(request, str(exc))

    user = await users.find_one({"_id": ObjectId(result.user_id)})
    if not user:
        return unauthorized_without_cookie(request, "User not found")

    if result.new_token:
        set_refresh_cookie(response, request, result.new_token)

    return TokenResponse(
        access_token=create_access_token(result.user_id),
        token_type="bearer",
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout_user(
    request: Request,
    refresh_tokens: RefreshTokenCollection,
):
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if token:
        await revoke_refresh_token(refresh_tokens, token)

    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_refresh_cookie(response, request)
    return response


CurrentUser = Annotated[UserResponse, Depends(get_current_user)]


async def get_optional_user(
    request: Request,
    collection: UserCollection,
) -> UserResponse | None:
    # Public routes that behave differently for a signed-in user. A token that is
    # sent but invalid still fails with 401, so the client can refresh it.
    if not request.headers.get("authorization"):
        return None

    return await get_current_user(request, collection)


OptionalUser = Annotated[UserResponse | None, Depends(get_optional_user)]


def require_roles(*roles: str):
    async def role_checker(current_user: CurrentUser):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )
        return current_user

    return role_checker


PublisherUser = Annotated[
    UserResponse,
    Depends(require_roles(*PUBLISHER_ROLES)),
]


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: CurrentUser,
):
    return current_user
