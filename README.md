# 🐕 Dog Names - Search & Upload

A web application for searching dog names and uploading photos of dogs. Supports both English and Hebrew names.

## Features

- **Search**: Search for dogs by name (case-insensitive, partial matching)
- **Upload**: Upload dog photos with names
- **Bilingual**: Supports both English and Hebrew names
- **Responsive**: Works on desktop and mobile devices
- **Modern UI**: Clean, beautiful interface with smooth animations

## Technology Stack

- **Backend**: FastAPI (Python)
- **Database**: SQLite
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Image Storage**: Local filesystem

## Project Structure

```
DogNames/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── database.py          # Database models and connection
│   ├── models.py            # Pydantic models for validation
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── index.html           # Main page
│   ├── styles.css           # Styling
│   └── script.js            # Frontend logic
├── uploads/                 # Uploaded dog images (auto-created)
├── dogs.db                  # SQLite database (auto-created)
└── README.md                # This file
```

## Local Setup Instructions

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Step 1: Check Python Installation

```bash
python3 --version
```

If Python is not installed, download it from [python.org](https://www.python.org/downloads/).

### Step 2: Navigate to Project Directory

```bash
cd /Users/tomerbasan/Desktop/Repos/DogNames
```

### Step 3: Create Virtual Environment

```bash
python3 -m venv venv
```

### Step 4: Activate Virtual Environment

**On macOS/Linux:**
```bash
source venv/bin/activate
```

**On Windows:**
```bash
venv\Scripts\activate
```

You should see `(venv)` appear in your terminal prompt.

### Step 5: Install Dependencies

```bash
pip install -r backend/requirements.txt
```

### Step 6: Run the Backend Server

```bash
cd backend
python3 main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see output like:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
Database initialized successfully!
```

### Step 7: Open the Frontend

**Option A: Open directly in browser (Recommended)**
1. Navigate to the `frontend` folder
2. Double-click `index.html`
3. It will open in your default browser

**Option B: Use Python HTTP Server**
```bash
# Open a new terminal window
cd /Users/tomerbasan/Desktop/Repos/DogNames/frontend
python3 -m http.server 8080
```
Then open http://localhost:8080 in your browser.

### Step 8: Test the Application

1. The backend should be running at: http://localhost:8000
2. The frontend should be open in your browser
3. Try searching for a dog name
4. Try uploading a dog photo

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation (Swagger UI).

### Endpoints

- `GET /` - API information
- `GET /api/search?name={name}` - Search dogs by name
- `GET /api/dogs` - Get all dogs
- `POST /api/upload` - Upload a dog photo
- `DELETE /api/dogs/{id}` - Delete a dog (optional)

## Usage Guide

### Searching for Dogs

1. Type a dog name in the search bar (e.g., "Max", "Buddy", "מקס")
2. Results appear automatically as you type
3. Partial matches are supported (searching "ax" will find "Max")
4. Leave the search bar empty to see all dogs

### Uploading Dogs

1. Scroll to the "Upload Your Dog" section
2. Enter the dog's name (English or Hebrew)
3. Click "Choose File" and select an image
4. Supported formats: JPG, PNG, GIF (max 5MB)
5. Preview will appear automatically
6. Click "Upload Dog" to submit
7. Your dog will appear in the results immediately

## Troubleshooting

### Backend Issues

**Problem**: `ModuleNotFoundError: No module named 'fastapi'`
- **Solution**: Make sure you activated the virtual environment and installed dependencies:
  ```bash
  source venv/bin/activate
  pip install -r backend/requirements.txt
  ```

**Problem**: `Address already in use`
- **Solution**: Another process is using port 8000. Either:
  - Kill the process: `lsof -ti:8000 | xargs kill -9`
  - Use a different port: `uvicorn main:app --port 8001`

**Problem**: Database errors
- **Solution**: Delete `dogs.db` and restart the backend to recreate it

### Frontend Issues

**Problem**: "Failed to load dogs" error
- **Solution**: Make sure the backend server is running on http://localhost:8000

**Problem**: CORS errors in browser console
- **Solution**: The backend has CORS enabled. If issues persist, make sure you're accessing the frontend via http://localhost:8080 or file://

**Problem**: Images not loading
- **Solution**: Check that the `uploads` folder exists and has the correct permissions

## Deploying Online

### Option 1: Render (Free Tier Available)

Render is recommended for easy deployment with a free tier.

**Steps:**
1. Create a GitHub repository and push your code
2. Sign up at [render.com](https://render.com)
3. Create a new "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables if needed
7. Deploy!

**Note**: For production, you'll need to:
- Switch from SQLite to PostgreSQL (Render provides free PostgreSQL)
- Use cloud storage (Cloudinary, AWS S3) for images
- Update CORS settings to allow your domain

### Option 2: Railway

Similar to Render, with automatic deployments.

**Steps:**
1. Push code to GitHub
2. Sign up at [railway.app](https://railway.app)
3. Create new project from GitHub repo
4. Railway will auto-detect Python and deploy
5. Configure start command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

### Option 3: PythonAnywhere

Good for Python apps with a free tier.

**Steps:**
1. Sign up at [pythonanywhere.com](https://www.pythonanywhere.com)
2. Upload your files via the dashboard
3. Set up a web app with FastAPI
4. Configure the WSGI file
5. Deploy

### Option 4: Docker + VPS

For more control, use Docker and deploy to a VPS (DigitalOcean, Linode, etc.).

**Dockerfile example:**
```dockerfile
FROM python:3.11

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend/ ./backend/
COPY frontend/ ./frontend/

WORKDIR /app/backend

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Considerations

When deploying to production:

1. **Database**: Migrate from SQLite to PostgreSQL
   - Update `database.py` to use PostgreSQL connection string
   - Set `DATABASE_URL` environment variable

2. **File Storage**: Use cloud storage instead of local files
   - Integrate Cloudinary, AWS S3, or similar
   - Update upload endpoint in `main.py`

3. **Security**:
   - Update CORS origins to specific domains
   - Add authentication if needed
   - Use HTTPS
   - Set up rate limiting

4. **Environment Variables**:
   ```bash
   DATABASE_URL=postgresql://...
   CLOUDINARY_URL=cloudinary://...
   SECRET_KEY=your-secret-key
   ```

## Future Enhancements

- User authentication and profiles
- Edit/delete uploaded dogs
- Image optimization and resizing
- Pagination for large datasets
- Advanced search filters
- Social sharing features
- Admin dashboard

## License

MIT License - Feel free to use this project for personal or commercial purposes.

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review the API documentation at http://localhost:8000/docs
3. Check server logs for errors

## Author

Created with FastAPI and modern web technologies.
