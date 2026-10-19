import os

from dotenv import load_dotenv


load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "farm_db")
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

# Image uploads: "local" saves files under MEDIA_DIR, "cloudinary" uploads to Cloudinary.
IMAGE_STORAGE = os.getenv("IMAGE_STORAGE", "local").strip().lower()
MEDIA_DIR = os.getenv(
    "MEDIA_DIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "media"),
)
# Public base URL of this API, used to build links to locally stored images.
API_PUBLIC_URL = os.getenv("API_PUBLIC_URL", "http://localhost:8000").rstrip("/")
MAX_IMAGE_BYTES = 5 * 1024 * 1024

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")
CLOUDINARY_FOLDER = os.getenv("CLOUDINARY_FOLDER", "farm-destinations")
