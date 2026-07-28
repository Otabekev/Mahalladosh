# One image, one service: FastAPI serves the API *and* the built PWA from the same
# origin. Splitting them across two hosts would buy a CORS configuration, a second
# deploy to keep in step, and a session cookie that needs SameSite=None — for a
# pilot serving one district, none of that is worth it.

# ---- stage 1: build the PWA ----
FROM node:20-alpine AS web
WORKDIR /web
# copy manifests first so the dependency layer survives a source-only change
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
# `npm run build` also runs tsc and the four-language i18n guard, so a broken
# translation fails the image build rather than reaching a neighbour
RUN npm run build

# ---- stage 2: the runtime ----
FROM python:3.12-slim AS runtime
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /srv

COPY api/requirements.txt ./api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt

COPY api/ ./api/
COPY --from=web /web/dist ./web/dist

# Runs as a non-root user. UPLOAD_DIR must be writable by it — point that at a
# mounted volume in production or uploads are lost on the next deploy (the app
# says so loudly at startup; see app/routers/uploads.py).
RUN useradd --create-home --uid 10001 app && chown -R app:app /srv
USER app

WORKDIR /srv/api
EXPOSE 8000
# Migrations run at startup (RUN_MIGRATIONS_ON_START), which is correct for a single
# instance. Past one instance, set it false and run `alembic upgrade head` as a
# release step instead, or the instances race the same DDL.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
