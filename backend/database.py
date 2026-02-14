from sqlalchemy import create_engine, Column, Integer, String, DateTime, Date, Text, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Get the directory where this file is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Database file will be in the parent directory (DogNames/)
DATABASE_PATH = os.path.join(os.path.dirname(BASE_DIR), "dogs.db")

# Use DATABASE_URL from environment variable if available (for online hosting)
# Otherwise use local SQLite database
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Online: Use PostgreSQL from hosting platform
    # Render provides "postgres://" but SQLAlchemy needs "postgresql://"
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
    connect_args = {}
else:
    # Local: Use SQLite
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
    connect_args = {"check_same_thread": False}

# Create engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


class Dog(Base):
    """Dog model for storing dog information and image paths."""
    __tablename__ = "dogs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False, index=True)
    image_path = Column(String, nullable=False)  # Primary image (backwards compatible)
    images_json = Column(Text, nullable=True)  # JSON array of all image paths
    created_at = Column(DateTime, default=datetime.utcnow)

    # Optional fields
    age = Column(String, nullable=True)
    adoption_date = Column(Date, nullable=True)
    location = Column(String, nullable=True)
    city = Column(String, nullable=True)

    # Create index on name for faster searches
    __table_args__ = (
        Index('idx_name', 'name'),
    )


def init_db():
    """Initialize the database by creating all tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency for getting database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
