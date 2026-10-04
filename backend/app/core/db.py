from sqlmodel import Session, create_engine, select

from app import crud
from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserCreate

database_hosts = [host.get("host", "") for host in settings.DATABASE_URL.hosts()]
uses_supabase = any(
    host == "supabase.com"
    or host.endswith(".supabase.com")
    or host == "supabase.co"
    or host.endswith(".supabase.co")
    for host in database_hosts
)
engine = create_engine(
    str(settings.DATABASE_URL),
    pool_pre_ping=True,
    connect_args={"sslmode": "require"} if uses_supabase else {},
)


def init_db(session: Session) -> None:
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, uncomment the next line:
    # SQLModel.metadata.create_all(engine)

    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            phone_number="+910000000000",
            full_name="CropKart Administrator",
            role="admin",
            is_superuser=True,
        )
        user = crud.create_user(session=session, user_create=user_in)
    else:
        from app.core.security import get_password_hash

        user.hashed_password = get_password_hash(settings.FIRST_SUPERUSER_PASSWORD)
        user.is_superuser = True
        session.add(user)
        session.commit()
