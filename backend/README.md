# CropKart Backend Foundation

A clean, production-ready FastAPI backend foundation for **CropKart**, extracted and adapted from the official FastAPI Full-Stack Template.

---

## 🌟 Architecture & Directory Structure

```text
cropkart-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app initialization, middleware, routes
│   ├── crud.py                  # User CRUD & authentication helpers
│   ├── utils.py                 # Email delivery and reset token utilities
│   ├── initial_data.py          # Superuser seed script
│   │
│   ├── api/                     # API routers and dependencies
│   │   ├── __init__.py
│   │   ├── deps.py              # Auth & DB Session dependency injection
│   │   ├── main.py              # Aggregated API router
│   │   └── routes/              # Route endpoints
│   │       ├── __init__.py
│   │       ├── login.py         # OAuth2 token login, password recovery
│   │       ├── users.py         # User management endpoints
│   │       ├── utils.py         # Health check & test email endpoints
│   │       └── private.py       # Development testing endpoints
│   │
│   ├── core/                    # Core application settings & security
│   │   ├── __init__.py
│   │   ├── config.py            # Pydantic Settings & environment config
│   │   ├── db.py                # SQLModel engine & init logic
│   │   └── security.py          # Password hashing (Argon2/Bcrypt) & JWT
│   │
│   ├── models/                  # Database SQLModel tables
│   │   ├── __init__.py          # Table exports and backwards compatibility
│   │   └── user.py              # User database model
│   │
│   ├── schemas/                 # Request & Response Pydantic models
│   │   ├── __init__.py
│   │   ├── auth.py              # Token & NewPassword schemas
│   │   ├── msg.py               # Generic Message schema
│   │   └── user.py              # UserBase, UserCreate, UserPublic, etc.
│   │
│   ├── services/                # Business logic services placeholder
│   │   └── __init__.py
│   │
│   └── email-templates/         # Transactional HTML email templates
│       ├── new_account.html
│       ├── reset_password.html
│       └── test_email.html
│
├── alembic/                     # Database migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 0001_initial_user.py # Initial user table migration
│
├── tests/                       # Backend test suite
│   ├── __init__.py
│   ├── conftest.py              # Pytest fixtures (DB, Client, Auth tokens)
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── test_login.py
│   │       ├── test_users.py
│   │       └── test_private.py
│   ├── crud/
│   │   ├── __init__.py
│   │   └── test_user.py
│   ├── scripts/
│   │   └── __init__.py
│   └── utils/
│       ├── __init__.py
│       ├── user.py
│       └── utils.py
│
├── scripts/                     # Utility shell scripts
│   ├── format.sh
│   ├── lint.sh
│   ├── prestart.sh
│   ├── test.sh
│   └── tests-start.sh
│
├── alembic.ini                  # Alembic CLI configuration
├── pyproject.toml               # Python project definition & dependencies
├── .env.example                 # Example environment variables
├── .gitignore
├── .dockerignore
├── Dockerfile                   # Single-stage container build
└── README.md
```

---

## 🛠️ Tech Stack & Key Dependencies

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) `>=0.115.0`
- **Server**: [Uvicorn](https://www.uvicorn.org/)
- **ORM / Database**: [SQLModel](https://sqlmodel.tiangolo.com/) & [SQLAlchemy 2.0](https://www.sqlalchemy.org/) with `psycopg` (v3) PostgreSQL driver
- **Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
- **Data Validation & Settings**: [Pydantic v2](https://docs.pydantic.dev/) & [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- **Security & Password Hashing**: [pwdlib](https://github.com/Frank-van-Gameren/pwdlib) with Argon2 and legacy Bcrypt upgrade support
- **Authentication**: JWT tokens via [pyjwt](https://pyjwt.readthedocs.io/)
- **Testing**: [pytest](https://docs.pytest.org/), `pytest-cov`, and `httpx`

---

## 🚀 Getting Started

### 1. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your `.env` variables:
- `SECRET_KEY`: Set a secure random key for JWT signature.
- `FIRST_SUPERUSER`: Default admin email (e.g. `admin@cropkart.com`).
- `FIRST_SUPERUSER_PASSWORD`: Default admin password.
- `DATABASE_URL`: PostgreSQL / Supabase connection URI.

#### Connecting to Supabase:
Use your Supabase connection string (Session or Transaction pooler):
```env
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### 2. Install Dependencies

Using `uv` (recommended):
```bash
uv sync
```
Or using standard `pip`:
```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -e ".[dev]"
```

### 3. Run Database Migrations

Apply existing migrations:
```bash
alembic upgrade head
```

Initialize the default superuser:
```bash
python app/initial_data.py
```

### 4. Start Development Server

```bash
fastapi dev app/main.py
```
Or with Uvicorn:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 📖 API Documentation & Verification

Once the server is running:
- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc UI**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check Endpoint**: [http://localhost:8000/health](http://localhost:8000/health) or [http://localhost:8000/api/v1/utils/health-check/](http://localhost:8000/api/v1/utils/health-check/)
- **OpenAPI Schema**: [http://localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json)

---

## 🧪 Running Tests

Run the test suite with pytest:
```bash
pytest
```
Or with test coverage report:
```bash
pytest --cov=app --cov-report=term-missing tests
```

---

## 📦 Docker Build

Build and run the Docker container:

```bash
docker build -t cropkart-backend .
docker run -p 8000:8000 --env-file .env cropkart-backend
```

---

## 🔄 Structural Adaptations from Template

1. **Frontend Decoupling**: Completely removed the frontend folder, bun build steps, static file mounts, and UI demo pages.
2. **Entity Purification**: Removed the demo `Item` entity, its database table, routes, CRUD functions, and item-related tests.
3. **Clean Domain Segregation**: Introduced dedicated `app/models/` and `app/schemas/` packages with clear separation of DB tables and Pydantic DTOs, while retaining full re-export compatibility.
4. **Services Placeholder**: Added `app/services/` for CropKart business logic modules (Orders, Crops, Mandi Prices, CropSathi AI, Transport, etc.).
5. **Direct Configuration**: Updated `app/core/config.py` to load `.env` from local folder first with parent fallback.
6. **Alembic Relocation**: Positioned `alembic` migrations at the backend root for standard Alembic CLI operations.
