import asyncio
import contextlib
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models  # noqa: F401 — register tables
from .db import Base, SessionLocal, engine
from .routers import (
    admin,
    auth,
    geo,
    households,
    mahallas,
    notifications,
    posts,
    proposals,
    services,
    uploads,
)
from .routers.uploads import UPLOAD_DIR
from .scheduler import run_sweep, scheduler_loop
from .seed import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (auth, geo, mahallas, households, posts, proposals, services, admin, notifications, uploads):
    app.include_router(module.router, prefix="/api")

app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok"}
