"""Image uploads for share posts. Every image is re-encoded through Pillow:
validates it's a real image, strips EXIF (incl. GPS — privacy), caps dimensions."""

import io
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from PIL import Image

from .. import models
from ..config import settings
from ..deps import require_member

logger = logging.getLogger("mahalladosh.uploads")

router = APIRouter(prefix="/uploads", tags=["uploads"])

DEFAULT_UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR = Path(settings.upload_dir).expanduser().resolve() if settings.upload_dir else DEFAULT_UPLOAD_DIR
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def check_uploads_durable() -> None:
    """Say out loud, at startup, where uploads go and whether they will survive.

    The default directory lives inside the application tree. On a container host
    that is wiped on every redeploy — and the failure is completely silent: the
    Post and HouseholdImage rows still hold /api/uploads/<uuid>.jpg, the files are
    simply gone, so a family's album turns into broken images with nothing in the
    logs and no error anywhere. Silence is the actual bug; this makes it loud.

    A warning rather than a refusal, because ephemeral uploads are perfectly fine
    for a throwaway demo — that case just has to be a decision someone made
    (UPLOADS_MAY_BE_EPHEMERAL=true) instead of something nobody noticed.
    """
    logger.info("Uploads directory: %s", UPLOAD_DIR)
    if settings.is_dev or settings.uploads_may_be_ephemeral:
        return
    app_dir = DEFAULT_UPLOAD_DIR.parent
    inside_app = UPLOAD_DIR == DEFAULT_UPLOAD_DIR or app_dir in UPLOAD_DIR.parents
    if inside_app:
        logger.warning(
            "UPLOADS ARE NOT DURABLE: %s is inside the application directory, so on a "
            "container host every uploaded photo is lost on the next redeploy while the "
            "database rows still point at it. Set UPLOAD_DIR to a mounted volume, or set "
            "UPLOADS_MAY_BE_EPHEMERAL=true to say this is a demo and you accept it.",
            UPLOAD_DIR,
        )

MAX_BYTES = 6 * 1024 * 1024  # 6 MB raw upload cap
MAX_DIM = 1600
# Decompression budget. Pillow allocates ~4 bytes per pixel while decoding, so the
# old 40 MP ceiling let a ~0.6 MB JPEG claim ~230 MB and a handful of concurrent
# uploads exhaust a small instance. 24 MP covers every phone camera anyone in the
# mahalla is holding while capping one decode near 100 MB — and the output is
# thumbnailed to 1600px regardless, so the extra pixels were never used.
MAX_PIXELS = 24_000_000


@router.post("")
def upload_image(
    file: UploadFile,
    _: models.User = Depends(require_member),
):
    # sync endpoint on purpose: Pillow work is CPU-bound and must run in the
    # threadpool, not on the event loop
    raw = file.file.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Rasm juda katta (maks. 6 MB)")
    try:
        img = Image.open(io.BytesIO(raw))
        if img.width * img.height > MAX_PIXELS:
            raise HTTPException(status_code=400, detail="Rasm o'lchami juda katta")
        img.load()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Fayl rasm emas") from None

    # re-encode: strips metadata, normalizes format, bounds size
    img = img.convert("RGB")
    img.thumbnail((MAX_DIM, MAX_DIM))
    name = f"{uuid.uuid4().hex}.jpg"
    img.save(UPLOAD_DIR / name, "JPEG", quality=85)
    return {"url": f"/api/uploads/{name}"}
