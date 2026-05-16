# Dockerfile

# Stage 1: Build Python dependencies
# ffmpeg is NOT needed here — only build-essential for compiling C extensions
FROM python:3.11-slim AS builder
WORKDIR /opt/venv
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
COPY packages/requirements.txt ./requirements.txt
RUN python -m venv .
RUN . bin/activate && pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Stage 2: Final production image
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV APP_ENV=production
WORKDIR /app

# Install runtime deps: curl (healthcheck) + ffmpeg (pydub audio processing)
# Split into two RUN commands so ffmpeg layer is cached independently
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create directories required by the application
RUN mkdir -p app gunicorn documents scripts alembic generated_documents document_storage

COPY --from=builder /opt/venv /opt/venv
COPY app ./app/
COPY gunicorn ./gunicorn/
COPY utils ./utils/
COPY alembic ./alembic/
COPY alembic.ini ./
COPY scripts ./scripts/
COPY start_gunicorn.sh ./

RUN chmod -R 755 /app/*/
RUN chmod +x start_gunicorn.sh utils/wait_for_db.py 2>/dev/null || true

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/app"

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD BASE_PATH=${BASE_PATH:-} && API_PATH="${BASE_PATH}/api" && curl -f http://localhost:8000${API_PATH}/health || exit 1

EXPOSE 8000

ENTRYPOINT ["sh", "start_gunicorn.sh"]
