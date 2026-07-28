import asyncio
import contextlib
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
