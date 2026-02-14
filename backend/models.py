from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional


class DogUpload(BaseModel):
    """Model for dog upload request."""
    name: str = Field(..., min_length=1, max_length=100, description="Dog's name")
    age: Optional[str] = None
    adoption_date: Optional[date] = None
    location: Optional[str] = None
    city: Optional[str] = None


class DogResponse(BaseModel):
    """Model for dog response."""
    id: int
    name: str
    image_path: str
    images: Optional[list[str]] = None  # List of all image paths
    created_at: datetime
    age: Optional[str] = None
    adoption_date: Optional[date] = None
    location: Optional[str] = None
    city: Optional[str] = None

    class Config:
        from_attributes = True  # Allows converting SQLAlchemy models to Pydantic


class DogSearchResponse(BaseModel):
    """Model for search results."""
    count: int
    dogs: list[DogResponse]


class UploadResponse(BaseModel):
    """Model for upload response."""
    message: str
    dog: DogResponse
