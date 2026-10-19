from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorCollection

from database.dependencies import get_user_collection
from models.user import (
    TokenResponse,
    UserLogin,
    UserRegister,
    PUBLISHER_ROLES,
    UserResponse,
    normalize_role,
)
from security import create_access_token, decode_access_token, hash_password, verify_password


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


UserCollection = Annotated[
    AsyncIOMotorCollection,
    Depends(get_user_collection),
]


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
    collection: UserCollection,
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

    token = create_access_token(str(user["_id"]))

    return TokenResponse(
        access_token=token,
        token_type="bearer",
    )


CurrentUser = Annotated[UserResponse, Depends(get_current_user)]


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
