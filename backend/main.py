from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import os
import shutil
import json
from datetime import datetime
from PIL import Image
from io import BytesIO
import pillow_heif

# Register HEIF opener with Pillow
pillow_heif.register_heif_opener()

from database import init_db, get_db, Dog
from models import DogResponse, DogSearchResponse, UploadResponse

# Cloudinary setup (optional - only if CLOUDINARY_URL is set)
USE_CLOUDINARY = False
if os.getenv("CLOUDINARY_URL"):
    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(secure=True)
        USE_CLOUDINARY = True
        print("✅ Cloudinary configured for image storage")
    except ImportError:
        print("⚠️  Cloudinary URL set but package not installed. Using local storage.")
else:
    print("📁 Using local file storage for images")

# Create FastAPI app
app = FastAPI(
    title="DogFinder API",
    description="API for searching and uploading dog photos by name",
    version="1.0.0"
)

# Configure CORS to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(os.path.dirname(BASE_DIR), "uploads")

# Ensure uploads directory exists (for local storage)
if not USE_CLOUDINARY:
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    # Mount uploads directory for serving static files
    app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Allowed image extensions
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".heic", ".heif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


async def save_image(file_contents: bytes, filename: str) -> str:
    """
    Save image to Cloudinary (if configured) or local storage.
    Returns: image identifier (Cloudinary URL or local filename)
    """
    if USE_CLOUDINARY:
        # Upload to Cloudinary
        try:
            result = cloudinary.uploader.upload(
                file_contents,
                folder="dogfinder",
                public_id=filename.rsplit('.', 1)[0],  # Remove extension
                overwrite=True,
                resource_type="image"
            )
            return result['secure_url']  # Return full Cloudinary URL
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload to Cloudinary: {str(e)}")
    else:
        # Save locally
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        safe_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(UPLOADS_DIR, safe_filename)

        try:
            with open(file_path, "wb") as f:
                f.write(file_contents)
            return safe_filename  # Return just filename for local storage
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")


def dog_to_response(dog: Dog) -> DogResponse:
    """Convert Dog model to DogResponse with images parsed."""
    images = None
    if dog.images_json:
        try:
            images = json.loads(dog.images_json)
        except:
            images = [dog.image_path]
    else:
        images = [dog.image_path]

    return DogResponse(
        id=dog.id,
        name=dog.name,
        image_path=dog.image_path,
        images=images,
        created_at=dog.created_at,
        age=dog.age,
        adoption_date=dog.adoption_date,
        location=dog.location,
        city=dog.city
    )


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    init_db()
    print("Database initialized successfully!")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "DogFinder API",
        "version": "1.0.0",
        "endpoints": {
            "search": "/api/search?name=<dog_name>",
            "upload": "/api/upload",
            "all_dogs": "/api/dogs"
        }
    }


@app.get("/api/search", response_model=DogSearchResponse)
async def search_dogs(
    name: Optional[str] = Query(None, description="Dog name to search for"),
    db: Session = Depends(get_db)
):
    """
    Search for dogs by name (case-insensitive, supports Hebrew and English).
    If no name is provided, returns all dogs.
    """
    if name:
        # Case-insensitive search with partial matching
        dogs = db.query(Dog).filter(Dog.name.ilike(f"%{name}%")).all()
    else:
        # Return all dogs if no search term
        dogs = db.query(Dog).all()

    return DogSearchResponse(
        count=len(dogs),
        dogs=[dog_to_response(dog) for dog in dogs]
    )


@app.get("/api/dogs", response_model=DogSearchResponse)
async def get_all_dogs(db: Session = Depends(get_db)):
    """Get all dogs in the database."""
    dogs = db.query(Dog).order_by(Dog.created_at.desc()).all()
    return DogSearchResponse(
        count=len(dogs),
        dogs=[dog_to_response(dog) for dog in dogs]
    )


@app.post("/api/upload", response_model=UploadResponse)
async def upload_dog(
    name: str = Form(..., description="Dog's name"),
    files: List[UploadFile] = File(..., description="Dog's photos (multiple allowed)"),
    age: Optional[str] = Form(None, description="Dog's age"),
    adoption_date: Optional[str] = Form(None, description="Adoption date"),
    location: Optional[str] = Form(None, description="Location"),
    city: Optional[str] = Form(None, description="City"),
    db: Session = Depends(get_db)
):
    """
    Upload dog photos (multiple) with a name and optional details.
    Accepts: jpg, jpeg, png, gif, heic, heif (max 5MB per file).
    HEIC/HEIF images are automatically converted to JPEG.
    Optional fields: age, adoption_date, location, city.
    """
    saved_images = []

    # Process each uploaded file
    for file in files:
        # Validate file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type for {file.filename}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # Read file content
        contents = await file.read()
        file_size = len(contents)

        # Validate file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File {file.filename} too large. Maximum size: {MAX_FILE_SIZE / (1024*1024):.1f}MB"
            )

        # Validate and process image (convert HEIC to JPEG if needed)
        try:
            image = Image.open(BytesIO(contents))

            # Check if it's a HEIC/HEIF file and convert to JPEG
            if file_ext in {".heic", ".heif"}:
                # Convert to RGB (HEIC might be in different color mode)
                if image.mode != "RGB":
                    image = image.convert("RGB")

                # Save as JPEG in memory
                jpeg_buffer = BytesIO()
                image.save(jpeg_buffer, format="JPEG", quality=90)
                jpeg_buffer.seek(0)
                contents = jpeg_buffer.read()

                # Update filename to .jpg
                file.filename = os.path.splitext(file.filename)[0] + ".jpg"

            else:
                # Validate non-HEIC images
                image.verify()

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {file.filename} - {str(e)}")

        # Save image (to Cloudinary or local storage)
        image_identifier = await save_image(contents, file.filename)
        saved_images.append(image_identifier)

    # Parse adoption date if provided
    parsed_adoption_date = None
    if adoption_date:
        try:
            from datetime import date as date_parser
            parsed_adoption_date = date_parser.fromisoformat(adoption_date)
        except ValueError:
            pass  # Ignore invalid dates

    # Create database entry
    db_dog = Dog(
        name=name,
        image_path=saved_images[0],  # First image as primary
        images_json=json.dumps(saved_images),  # All images as JSON (URLs or filenames)
        age=age if age else None,
        adoption_date=parsed_adoption_date,
        location=location if location else None,
        city=city if city else None
    )
    db.add(db_dog)
    db.commit()
    db.refresh(db_dog)

    return UploadResponse(
        message="Dog uploaded successfully!",
        dog=dog_to_response(db_dog)
    )


@app.delete("/api/dogs/{dog_id}")
async def delete_dog(dog_id: int, db: Session = Depends(get_db)):
    """Delete a dog by ID (optional endpoint for future use)."""
    dog = db.query(Dog).filter(Dog.id == dog_id).first()

    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found")

    # Delete image file
    file_path = os.path.join(UPLOADS_DIR, dog.image_path)
    if os.path.exists(file_path):
        os.remove(file_path)

    # Delete database entry
    db.delete(dog)
    db.commit()

    return {"message": "Dog deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
