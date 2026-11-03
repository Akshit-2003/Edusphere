# app/main.py
from fastapi import FastAPI
from app.core.database import DATABASE_URL, engine, Base
import app.models.user as user_models
import app.models.workspace as workspace_models
import app.models.academic as academic_models
import app.models.study as study_models
import contextlib

# Naye banaye hue API routes import kar rahe hain
from app.api import user, workspace, task, academic, study
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.engine import make_url


async def migrate_user_profile_columns(conn):
    """Add onboarding fields without deleting existing user or profile data."""
    columns = (
        'department VARCHAR(160)',
        'semester VARCHAR(80)',
        'roll_number VARCHAR(80)',
        'cgpa VARCHAR(40)',
        'target_goal VARCHAR(160)',
        'avatar_url VARCHAR',
        'onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE',
        "preferences JSONB NOT NULL DEFAULT '{}'::jsonb",
    )
    for column in columns:
        await conn.execute(text(f'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS {column}'))


async def migrate_user_verification_columns(conn):
    """Keep existing accounts usable while enabling OTP verification for new ones."""
    columns = (
        'email_verified BOOLEAN NOT NULL DEFAULT TRUE',
        'verification_otp_hash VARCHAR(128)',
        'verification_otp_expiry TIMESTAMP',
        'verification_otp_sent_at TIMESTAMP',
        'verification_otp_attempts INTEGER NOT NULL DEFAULT 0',
    )
    for column in columns:
        await conn.execute(text(f'ALTER TABLE users ADD COLUMN IF NOT EXISTS {column}'))


async def create_performance_indexes(conn):
    """Indexes for the scoped, newest-first dashboard and workspace reads."""
    statements = (
        'CREATE INDEX IF NOT EXISTS ix_documents_owner_updated ON documents (owner_id, updated_at DESC)',
        'CREATE INDEX IF NOT EXISTS ix_study_tasks_user_status_due ON study_tasks (user_id, status, due_at)',
        'CREATE INDEX IF NOT EXISTS ix_study_sessions_user_completed ON study_sessions (user_id, completed_at DESC)',
        'CREATE INDEX IF NOT EXISTS ix_calendar_events_user_starts ON calendar_events (user_id, starts_at)',
        'CREATE INDEX IF NOT EXISTS ix_flashcards_user_next_review ON flashcards (user_id, next_review_at)',
    )
    for statement in statements:
        await conn.execute(text(statement))


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await migrate_user_profile_columns(conn)
        await migrate_user_verification_columns(conn)
        await create_performance_indexes(conn)
    yield
    await engine.dispose()

app = FastAPI(title="Edusphere API", lifespan=lifespan)
# CORS Setting: Frontend ko Backend se baat karne ki permission
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Abhi testing ke liye hum sabko allow kar rahe hain
    allow_credentials=True,
    allow_methods=["*"],  # GET, POST, PUT, DELETE sab allowed hain
    allow_headers=["*"],  # Sabhi tarah ke headers allowed hain
)
# Yahan humne apne naye API routes ko connect kar diya!
app.include_router(user.router, prefix="/api", tags=["Users & Roles"])
app.include_router(workspace.router, prefix="/api", tags=
["Workspaces"])
app.include_router(task.router, prefix="/api", tags=["Tasks"])
app.include_router(academic.router, prefix="/api", tags=["Academic"])
app.include_router(study.router, prefix="/api", tags=["Study"])


@app.get("/api/system-info")
async def system_info():
    """Return display-safe database metadata without exposing connection secrets."""
    url = make_url(DATABASE_URL)
    provider = "Neon PostgreSQL" if url.host and url.host.endswith(".neon.tech") else "PostgreSQL"
    return {
        "application": app.title,
        "database": {
            "name": url.database or "Configured database",
            "engine": "PostgreSQL",
            "provider": provider,
            "connection": "Secure",
        },
    }


@app.get("/")
async def root():
    return {"message": "Modular Backend is Live! 🚀"}
