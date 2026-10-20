import asyncio
import logging
import os
from contextlib import asynccontextmanager, suppress
from datetime import timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import (
    CORS_ORIGINS,
    IMAGE_STORAGE,
    MEDIA_DIR,
    ORPHAN_UPLOAD_MAX_AGE_HOURS,
    UPLOAD_CLEANUP_INTERVAL_HOURS,
)
from database.connection import create_mongo_client, get_database
from routes.auth import router as auth_router
from routes.destinations import router as destination_router
from routes.images import router as image_router
from routes.users import router as user_router
from services.destination_images import cleanup_orphaned_uploads
from services.destination_service import ensure_destination_indexes
from services.image_storage import create_image_storage
from services.refresh_tokens import ensure_refresh_token_indexes
from services.user_service import migrate_legacy_roles


logger = logging.getLogger(__name__)


async def clean_up_uploads_periodically(app: FastAPI):
    database = app.state.database

    while True:
        await asyncio.sleep(UPLOAD_CLEANUP_INTERVAL_HOURS * 3600)
        try:
            removed = await cleanup_orphaned_uploads(
                app.state.image_storage,
                database["uploads"],
                database["destinations"],
                timedelta(hours=ORPHAN_UPLOAD_MAX_AGE_HOURS),
            )
            if removed:
                logger.info("Removed %d orphaned uploads", removed)
        except Exception:
            # One failed run must not stop later runs.
            logger.exception("Orphaned upload cleanup failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = create_mongo_client()

    app.state.mongo_client = client
    app.state.database = get_database(client)
    app.state.image_storage = create_image_storage()

    await ensure_destination_indexes(app.state.database["destinations"])
    await migrate_legacy_roles(app.state.database["users"])
    await ensure_refresh_token_indexes(app.state.database["refresh_tokens"])

    cleanup_task = None
    if UPLOAD_CLEANUP_INTERVAL_HOURS > 0:
        cleanup_task = asyncio.create_task(clean_up_uploads_periodically(app))

    yield

    if cleanup_task:
        cleanup_task.cancel()
        with suppress(asyncio.CancelledError):
            await cleanup_task

    client.close()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(destination_router)
app.include_router(user_router)
app.include_router(image_router)

if IMAGE_STORAGE == "local":
    os.makedirs(MEDIA_DIR, exist_ok=True)
    app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")


@app.get("/")
async def root():
    return {"message": "FARM Stack API running"}
