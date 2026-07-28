import asyncio
import contextlib
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import models  # noqa: F401 — register tables
from .config import settings
from .db import SessionLocal
from .migrate import upgrade_to_head
from .routers import (
    admin,
    auth,
    geo,
    households,
    mahallas,
    me,
    notifications,
    posts,
    proposals,
    raisi,
    reports,
    search,
    services,
    uploads,
    users,
)
from .routers.uploads import UPLOAD_DIR, check_uploads_durable
from .scheduler import run_sweep, scheduler_loop
from .security import check_secret_key
from .seed import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Alembic owns the schema now; create_all would build the tables without an
    # alembic_version row and the next upgrade would collide with them.
    if settings.run_migrations_on_start:
        upgrade_to_head()
    check_secret_key()
    check_uploads_durable()
    with SessionLocal() as db:
        seed(db)
    # catch up on overdue time-based work (votes past deadline, missed honors)
    # before serving, then keep sweeping every 5 minutes in the background
    await asyncio.to_thread(run_sweep)
    task = asyncio.create_task(scheduler_loop())
    yield
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task


app = FastAPI(title="Mahalladosh API", lifespan=lifespan)

# Cap the request body before anything else looks at it. Without this, an
# unauthenticated caller could stream an arbitrarily large body and the server would
# buffer it while the route's require_member dependency had not run yet — the cost is
# paid before the gate. Content-Length is a claim, so the streaming read below
# enforces the real thing too.
MAX_BODY_BYTES = 8 * 1024 * 1024  # a little over the 6 MB upload cap


@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_BODY_BYTES:
        return JSONResponse({"detail": "So'rov juda katta"}, status_code=413)
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (auth, geo, mahallas, households, posts, proposals, services, admin, notifications, uploads, me, reports, raisi, users, search):
    app.include_router(module.router, prefix="/api")

app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---------- serve the built PWA from the same origin ----------

# One service, one origin. The frontend already calls `/api/...` relatively, so
# serving it from here means no CORS in production, no second host to configure, and
# a session cookie that is simply first-party rather than needing SameSite=None.
#
# Absent in development: vite serves the frontend on :5174 and proxies /api here, so
# there is no dist/ to find and this block does nothing.
WEB_DIST = Path(__file__).resolve().parent.parent.parent / "web" / "dist"

if WEB_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=str(WEB_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        """Return index.html for any non-API path, so a deep link works.

        Registered last, and it must stay last: it matches everything, so any route
        declared after it would be unreachable. /api is excluded explicitly rather
        than by ordering — an unmatched /api/... must 404 as JSON, not hand the
        caller an HTML page a client would then fail to parse.
        """
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        # a real file (favicon, manifest, service worker) wins over the SPA shell
        candidate = WEB_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(WEB_DIST / "index.html")
