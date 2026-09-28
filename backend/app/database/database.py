"""
DealIQ – Database setup (SQLAlchemy + SQLite)
Clean architecture so SQLite can be swapped for PostgreSQL with only DATABASE_URL change.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency for database session."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables in the database."""
    # Import all models so metadata knows about them
    import app.models.deal  # noqa: F401
    import app.models.interaction  # noqa: F401
    Base.metadata.create_all(bind=engine)
