# 🚀 Deployment Guide — Dr Madan Kumar Das Website

## The Problem (Why changes don't sync across laptops)
The backend only runs on your local computer right now.
To make changes sync everywhere, you need to host the backend online.

---

## Step 1: Push to GitHub

1. Create a free account at https://github.com
2. Create a new repository (e.g. "sir-website")
3. Open Terminal in the sir_website folder and run:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sir-website.git
git push -u origin main
```

---

## Step 2: Set up MongoDB Atlas (Free Database)

1. Go to https://www.mongodb.com/atlas → Sign Up Free
2. Create a FREE cluster (M0)
3. Under "Database Access" → Add a user with password
4. Under "Network Access" → Add IP: 0.0.0.0/0 (allow all)
5. Click "Connect" → "Connect your application"
6. Copy the connection string. It looks like:
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/sir_website

---

## Step 3: Deploy Backend on Render (Free)

1. Go to https://render.com → Sign Up (use GitHub login)
2. Click New → Web Service
3. Connect your GitHub repo
4. Fill in:
   - Name: sir-website-backend
   - Root Directory: backend
   - Build Command: npm install
   - Start Command: node server.js
5. Add Environment Variables:
   - MONGO_URI        = (paste your Atlas connection string)
   - JWT_SECRET       = madan_nitj_secret_2024_abc123xyz (any long string)
   - ADMIN_USERNAME   = admin
   - ADMIN_PASSWORD   = (choose a password for sir)
   - PORT             = 3000
6. Click "Create Web Service"
7. Wait 2-3 minutes. You'll get a URL like: https://sir-website-xxxx.onrender.com
   → This is your BACKEND URL

---

## Step 4: Deploy Frontend on Render (Free)

1. On Render → New → Static Site
2. Connect same GitHub repo
3. Fill in:
   - Name: sir-website-frontend
   - Root Directory: (leave blank — use root folder)
   - Build Command: (leave blank)
   - Publish Directory: .
4. Click "Create Static Site"
5. You'll get a URL like: https://sir-website-frontend.onrender.com
   → This is your FRONTEND URL

6. Go back to your BACKEND service on Render
7. Add one more environment variable:
   - FRONTEND_URL = https://sir-website-frontend.onrender.com

---

## Step 5: Share with Sir

Give your sir:
- Website URL: https://sir-website-frontend.onrender.com
- Admin panel: https://sir-website-frontend.onrender.com/admin-login.html
- Username: admin
- Password: (whatever you set in step 3)

---

## How it works after deployment

- Sir logs in at /admin-login.html
- Makes changes (photo, about, publications, etc.)
- Changes are saved to MongoDB database
- Anyone opening the website on ANY device sees the latest data

---

## Important Notes

- Render free tier sleeps after 15 min of inactivity → first load may take 30 seconds
- To avoid this, upgrade to Render Starter ($7/month) or use a free ping service like https://uptimerobot.com
- Never share the .env file or JWT_SECRET with anyone

---

## File Structure (Clean)

```
sir_website/
├── index.html          ← Home page
├── research.html       ← Research page
├── teaching.html       ← Teaching page
├── publications.html   ← Publications page
├── cv.html             ← CV page
├── projects.html       ← Projects page
├── students.html       ← Students page
├── positions.html      ← Open positions
├── styles.css          ← Main stylesheet
├── research.css        ← Research page styles
├── api.js              ← Shared API helper (DO NOT DELETE)
├── script.js           ← Misc scripts
├── admin-login.html    ← Admin login page
├── admin-dashboard.html← Admin panel (where sir manages content)
└── backend/
    ├── server.js       ← Node.js server
    ├── package.json    ← Dependencies
    ├── .env.example    ← Template for environment variables
    ├── models/
    │   └── SiteData.js ← MongoDB schema
    ├── routes/
    │   ├── auth.js     ← Login/password routes
    │   └── data.js     ← Content read/write routes
    └── middleware/
        └── auth.js     ← JWT token verification
```
