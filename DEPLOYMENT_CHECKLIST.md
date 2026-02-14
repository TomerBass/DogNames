# 🚀 Deployment Checklist for DogFinder

## ✅ What's Already Done

- [x] Updated `requirements.txt` with cloudinary and psycopg2-binary
- [x] Updated `database.py` to auto-detect SQLite (local) vs PostgreSQL (online)
- [x] Updated `main.py` to auto-detect local storage vs Cloudinary
- [x] Updated `script.js` to auto-detect localhost vs production
- [x] Added helper function to handle both Cloudinary URLs and local filenames

## 📝 What You Need to Do

### Step 1: Create Free Accounts (5 minutes)

#### GitHub
- [ ] Go to https://github.com/signup
- [ ] Create account with email
- [ ] Verify email

#### Render
- [ ] Go to https://render.com
- [ ] Sign up with GitHub account (easiest)

#### Cloudinary
- [ ] Go to https://cloudinary.com/users/register_free
- [ ] Create free account
- [ ] Go to Dashboard after login
- [ ] Copy your "API Environment variable" (starts with `cloudinary://`)
- [ ] Save it somewhere - you'll need it later!

---

### Step 2: Create GitHub Repository (5 minutes)

#### On GitHub Website:
1. [ ] Click the "+" in top right → "New repository"
2. [ ] Name it: `dogfinder` (or any name you like)
3. [ ] Keep it **Public** (required for Render free tier)
4. [ ] **Don't** check "Add README" (we already have files)
5. [ ] Click "Create repository"
6. [ ] **Copy the repository URL** (looks like: `https://github.com/YOUR_USERNAME/dogfinder.git`)

---

### Step 3: Upload Code to GitHub (10 minutes)

Open Terminal and run these commands **one by one**:

```bash
# 1. Navigate to your project
cd /Users/tomerbasan/Desktop/Repos/DogNames

# 2. Initialize git (if not already done)
git init

# 3. Add all files
git add .

# 4. Create first commit
git commit -m "Initial commit - DogFinder ready for deployment"

# 5. Set main branch
git branch -M main

# 6. Connect to GitHub (replace YOUR_USERNAME with your actual username!)
git remote add origin https://github.com/YOUR_USERNAME/dogfinder.git

# 7. Push to GitHub
git push -u origin main
```

If it asks for username/password:
- Username: your GitHub username
- Password: use a **Personal Access Token** (not your password)
  - Create token: https://github.com/settings/tokens → Generate new token (classic)
  - Check: `repo` scope
  - Copy the token and use it as password

---

### Step 4: Deploy Backend on Render (10 minutes)

1. [ ] Go to https://dashboard.render.com
2. [ ] Click "New +" → "Web Service"
3. [ ] Click "Connect" next to your `dogfinder` repository
4. [ ] Fill in the form:
   - **Name**: `dogfinder-backend` (or any name)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
5. [ ] Scroll down to "Advanced" and add Environment Variable:
   - **Key**: `CLOUDINARY_URL`
   - **Value**: (paste the Cloudinary URL you copied earlier)
6. [ ] Select **Free** instance type
7. [ ] Click "Create Web Service"
8. [ ] **Wait 3-5 minutes** for deployment to complete
9. [ ] **Copy the backend URL** (at top of page, looks like: `https://dogfinder-backend-xxx.onrender.com`)

---

### Step 5: Create PostgreSQL Database (5 minutes)

1. [ ] In Render Dashboard, click "New +" → "PostgreSQL"
2. [ ] Fill in:
   - **Name**: `dogfinder-db`
   - **Database**: `dogfinder`
   - **User**: `dogfinder`
   - **Region**: Same as backend
3. [ ] Select **Free** instance
4. [ ] Click "Create Database"
5. [ ] **Wait 2-3 minutes** for creation
6. [ ] Once ready, scroll down and copy "Internal Database URL"
7. [ ] Go back to your **Backend Web Service**
8. [ ] Go to "Environment" tab
9. [ ] Click "Add Environment Variable":
   - **Key**: `DATABASE_URL`
   - **Value**: (paste the Internal Database URL)
10. [ ] Click "Save Changes"
11. [ ] Backend will automatically restart (wait 1-2 minutes)

---

### Step 6: Update Frontend with Backend URL

You need to update one line in your code with the actual backend URL:

1. [ ] Open `/Users/tomerbasan/Desktop/Repos/DogNames/frontend/script.js`
2. [ ] Find line 4 (or near the top):
```javascript
: 'https://dogfinder-backend.onrender.com';  // Production
```
3. [ ] Replace `https://dogfinder-backend.onrender.com` with your actual backend URL
4. [ ] Save the file
5. [ ] Push update to GitHub:
```bash
cd /Users/tomerbasan/Desktop/Repos/DogNames
git add frontend/script.js
git commit -m "Update backend URL for production"
git push
```

---

### Step 7: Deploy Frontend on Render (5 minutes)

1. [ ] Go to Render Dashboard
2. [ ] Click "New +" → "Static Site"
3. [ ] Connect to same GitHub repository
4. [ ] Fill in:
   - **Name**: `dogfinder-frontend`
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Build Command**: Leave empty
   - **Publish Directory**: `frontend`
5. [ ] Click "Create Static Site"
6. [ ] **Wait 2-3 minutes** for deployment
7. [ ] **Copy the frontend URL** (looks like: `https://dogfinder-frontend.onrender.com`)

---

### Step 8: Test Your Live App! 🎉

1. [ ] Open your frontend URL in a browser
2. [ ] **Wait 30-60 seconds** on first visit (backend is "waking up")
3. [ ] Try searching for dogs (should be empty at first)
4. [ ] Try uploading a dog photo with name
5. [ ] Verify the upload appears in search results

---

## 🆘 Troubleshooting

### "Failed to fetch" error
- Check backend logs in Render dashboard for errors
- Make sure `CLOUDINARY_URL` is set in backend environment variables
- Make sure `DATABASE_URL` is set in backend environment variables
- Wait 30 seconds after first visiting (backend is waking up)

### Backend not deploying
- Check build logs in Render dashboard
- Make sure `requirements.txt` has all dependencies
- Make sure start command is correct

### Images not uploading
- Check Cloudinary URL is correct (starts with `cloudinary://`)
- Check backend logs for Cloudinary errors
- Verify Cloudinary account isn't over quota (free tier: 25GB)

### Database errors
- Make sure DATABASE_URL is set in backend environment variables
- Check PostgreSQL database is "Available" in Render dashboard
- Look at backend logs for specific error messages

---

## 🎯 After Deployment

### Your URLs:
- Frontend: `https://dogfinder-frontend.onrender.com` (or your chosen name)
- Backend API: `https://dogfinder-backend-xxx.onrender.com`

### Important Notes:
- **Free tier sleeps** after 15 minutes of inactivity
- First visit after sleep takes ~30 seconds to wake up
- Upgrade to paid ($7/month) for 24/7 uptime
- All uploaded photos go to Cloudinary (free tier: 25GB, 25k images)

### Making Updates:
Whenever you change code:
```bash
git add .
git commit -m "Description of changes"
git push
```
Render will automatically redeploy! (takes 2-5 minutes)

---

## ✅ Checklist Complete!

You now have a fully deployed dog finder web application! 🐶🎉

Share your frontend URL with friends and family!
