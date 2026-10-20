import io
import warnings

from PIL import Image, ImageOps


MAX_IMAGE_DIMENSION = 1600
WEBP_QUALITY = 82
# Rejects "decompression bombs": tiny files that expand to huge pixel buffers.
MAX_IMAGE_PIXELS = 40_000_000


class InvalidImageError(ValueError):
    pass


def optimize_image(content: bytes) -> bytes:
    """Return the image as WebP, at most MAX_IMAGE_DIMENSION px on its longest side.

    Applies the EXIF orientation first, then drops all metadata (EXIF, GPS location,
    camera details), so uploads do not leak where or how a photo was taken.
    """
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(content)) as source:
                if source.width * source.height > MAX_IMAGE_PIXELS:
                    raise InvalidImageError("Image dimensions are too large")

                source.load()
                image = ImageOps.exif_transpose(source)
    except InvalidImageError:
        raise
    except Exception as exc:
        # Corrupt pixel data or malformed EXIF can surface as many exception types.
        raise InvalidImageError("The file is not a readable image") from exc

    # WebP stores RGB or RGBA; palette and other modes are converted first.
    if image.mode not in ("RGB", "RGBA"):
        has_alpha = image.mode in ("LA", "PA") or "transparency" in image.info
        image = image.convert("RGBA" if has_alpha else "RGB")

    image.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)

    output = io.BytesIO()
    image.save(output, format="WEBP", quality=WEBP_QUALITY, method=6)
    return output.getvalue()
