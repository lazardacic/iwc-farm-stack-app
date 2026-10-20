import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from pymongo import ReturnDocument

from config import REFRESH_TOKEN_EXPIRE_DAYS


# Two tabs refreshing at once both send the same token. The second request
# within this window still gets an access token instead of being treated as theft.
REUSE_GRACE_PERIOD = timedelta(seconds=10)


class RefreshTokenError(Exception):
    pass


@dataclass
class RefreshResult:
    user_id: str
    # None when a concurrent request already rotated the token; keep the cookie as is.
    new_token: str | None


def hash_token(token: str) -> str:
    # Only hashes are stored, so a database leak does not expose usable tokens.
    return hashlib.sha256(token.encode()).hexdigest()


def _as_utc(value: datetime) -> datetime:
    # Motor returns naive datetimes that are already in UTC.
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


async def ensure_refresh_token_indexes(collection):
    await collection.create_index("token_hash", unique=True)
    await collection.create_index("family_id")
    # MongoDB deletes expired tokens on its own.
    await collection.create_index("expires_at", expireAfterSeconds=0)


async def issue_refresh_token(collection, user_id: str, family_id: str | None = None) -> str:
    """Store a new refresh token and return it. A family groups one login's rotations."""
    token = secrets.token_urlsafe(48)
    now = datetime.now(timezone.utc)

    await collection.insert_one({
        "token_hash": hash_token(token),
        "user_id": user_id,
        "family_id": family_id or uuid.uuid4().hex,
        "created_at": now,
        "expires_at": now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "revoked_at": None,
        "replaced_by": None,
    })

    return token


async def rotate_refresh_token(collection, token: str) -> RefreshResult:
    """Exchange a refresh token for a new one; each token can be used once.

    Using an already rotated token outside the grace period means it was copied
    by someone else, so the whole family (that login session) is revoked.
    """
    now = datetime.now(timezone.utc)
    record = await collection.find_one({"token_hash": hash_token(token)})

    if not record or _as_utc(record["expires_at"]) <= now:
        raise RefreshTokenError("Invalid or expired refresh token")

    if record["revoked_at"] is not None:
        rotated_recently = (
            record["replaced_by"] is not None
            and now - _as_utc(record["revoked_at"]) <= REUSE_GRACE_PERIOD
        )
        if rotated_recently:
            return RefreshResult(user_id=record["user_id"], new_token=None)

        await revoke_family(collection, record["family_id"])
        raise RefreshTokenError("Refresh token reuse detected")

    new_token = secrets.token_urlsafe(48)

    # Claim the old token atomically, so only one concurrent request rotates it.
    claimed = await collection.find_one_and_update(
        {"_id": record["_id"], "revoked_at": None},
        {"$set": {"revoked_at": now, "replaced_by": hash_token(new_token)}},
        return_document=ReturnDocument.AFTER,
    )
    if not claimed:
        return RefreshResult(user_id=record["user_id"], new_token=None)

    await collection.insert_one({
        "token_hash": hash_token(new_token),
        "user_id": record["user_id"],
        "family_id": record["family_id"],
        "created_at": now,
        "expires_at": now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "revoked_at": None,
        "replaced_by": None,
    })

    return RefreshResult(user_id=record["user_id"], new_token=new_token)


async def revoke_family(collection, family_id: str):
    await collection.update_many(
        {"family_id": family_id, "revoked_at": None},
        {"$set": {"revoked_at": datetime.now(timezone.utc)}},
    )


async def revoke_refresh_token(collection, token: str):
    """Log out: revoke every token of the session the given token belongs to."""
    record = await collection.find_one({"token_hash": hash_token(token)})
    if record:
        await revoke_family(collection, record["family_id"])
