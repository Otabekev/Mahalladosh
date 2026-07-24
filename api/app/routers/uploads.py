"""Image uploads for share posts. Every image is re-encoded through Pillow:
validates it's a real image, strips EXIF (incl. GPS — privacy), caps dimensions."""

import io
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from PIL import Image

from .. import models
from ..deps import require_member

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_BYTES = 6 * 1024 * 1024  # 6 MB raw upload cap
MAX_DIM = 1600
MAX_PIXELS = 40_000_000  # decompression-bomb guard on top of Pillow's default


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
