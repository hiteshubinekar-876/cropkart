FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV PATH="/app/.venv/bin:$PATH"

# Install uv
COPY --from=ghcr.io/astral-sh/uv:0.11.29 /uv /uvx /bin/

WORKDIR /app

# Copy dependency configuration first for cacheable resolution
COPY pyproject.toml uv.lock /app/

# Install locked production dependencies before copying application source
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# Copy application and migration files
COPY alembic.ini /app/
COPY alembic /app/alembic
COPY scripts /app/scripts
COPY app /app/app

# Install the project itself after application sources are present
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

EXPOSE 8000

CMD ["fastapi", "run", "app/main.py", "--port", "8000"]
