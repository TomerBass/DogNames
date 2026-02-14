# DogFinder - Deployment Guide

## Option 1: Render (Recommended - Free Tier)

### Prerequisites
- GitHub account
- Render account (free): https://render.com
- Cloudinary account (free): https://cloudinary.com

### Step-by-Step Deployment

#### 1. Setup Cloudinary (for image storage)
```bash
# Sign up at https://cloudinary.com
# Copy your CLOUDINARY_URL from dashboard (looks like: cloudinary://key:secret@cloud_name)
```

#### 2. Update backend for production

Add to `backend/requirements.txt`:
```
cloudinary
psycopg2-binary  # For PostgreSQL
```

Update `backend/database.py` to use environment variable for database:
```python
import os

# Use DATABASE_URL from environment (Render provides this)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH}")
# Render uses postgresql://, SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, connect_args={} if "postgresql" in DATABASE_URL else {"check_same_thread": False})
```

Update `backend/main.py` to use Cloudinary for uploads (replace file saving logic).

#### 3. Push to GitHub
```bash
cd /Users/tomerbasan/Desktop/Repos/DogNames
git init
git add .
git commit -m "Initial commit - DogFinder app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dogfinder.git
git push -u origin main
```

#### 4. Deploy on Render
1. Go to https://render.com/dashboard
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will detect `render.yaml` and set up services
5. Add environment variables:
   - `CLOUDINARY_URL`: Your Cloudinary URL
6. Click "Apply"

Your app will be live at: `https://dogfinder-frontend.onrender.com`

---

## Option 2: Railway (Easy Alternative)

### Steps:
1. Sign up at https://railway.app
2. Create new project from GitHub repo
3. Railway auto-detects Python and deploys
4. Add PostgreSQL database from Railway dashboard
5. Add environment variables
6. Deploy!

Cost: Free trial, then ~$5/month

---

## Option 3: Simple VPS (More Control)

### For DigitalOcean, Linode, or any VPS:

```bash
# 1. SSH into your server
ssh root@your-server-ip

# 2. Install dependencies
apt update && apt install python3-pip python3-venv nginx -y

# 3. Clone your repo
git clone https://github.com/YOUR_USERNAME/dogfinder.git
cd dogfinder

# 4. Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 5. Run with systemd (auto-restart)
sudo nano /etc/systemd/system/dogfinder.service
```

Add to service file:
```ini
[Unit]
Description=DogFinder API
After=network.target

[Service]
User=root
WorkingDirectory=/root/dogfinder/backend
Environment="PATH=/root/dogfinder/backend/venv/bin"
ExecStart=/root/dogfinder/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
```

```bash
# Start service
sudo systemctl enable dogfinder
sudo systemctl start dogfinder

# 6. Setup Nginx as reverse proxy
sudo nano /etc/nginx/sites-available/dogfinder
```

Add Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /root/dogfinder/frontend;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:8000;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/dogfinder /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Visit: http://your-server-ip

Cost: $5-10/month

---

## Option 4: PythonAnywhere (Simplest, Keep SQLite)

### Steps:
1. Sign up at https://www.pythonanywhere.com (free tier available)
2. Upload your files via Files tab
3. Create a web app → Flask/FastAPI
4. Set working directory to backend folder
5. Install dependencies in bash console
6. Configure WSGI file to point to your FastAPI app
7. Reload web app

**Pros**: Can keep SQLite and local file storage
**Cons**: Free tier has limitations, slower

---

## Recommended Quick Start (Render)

For fastest deployment with minimal changes:

1. **Sign up for free accounts**:
   - Render: https://render.com
   - Cloudinary: https://cloudinary.com

2. **Install additional dependencies**:
```bash
cd /Users/tomerbasan/Desktop/Repos/DogNames/backend
pip install cloudinary psycopg2-binary
pip freeze > requirements.txt
```

3. **Update code for Cloudinary** (I can help with this)

4. **Push to GitHub and connect to Render**

Would you like me to update the code for Render/Cloudinary deployment?
