import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import CORS_ORIGINS, IMAGE_STORAGE, MEDIA_DIR
from database.connection import create_mongo_client, get_database
from routes.auth import router as auth_router
from routes.destinations import router as destination_router
from routes.images import router as image_router
from routes.users import router as user_router
from services.destination_service import ensure_destination_indexes
from services.image_storage import create_image_storage
from services.user_service import migrate_legacy_roles


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = create_mongo_client()

    app.state.mongo_client = client
    app.state.database = get_database(client)
    app.state.image_storage = create_image_storage()

    await ensure_destination_indexes(app.state.database["destinations"])
    await migrate_legacy_roles(app.state.database["users"])

    yield

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
