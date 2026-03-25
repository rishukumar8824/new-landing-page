# USDT Buy/Sell Landing Page Lead System

Fresh full-stack project structure:

- `frontend/` -> Next.js + TailwindCSS (deploy to Vercel)
- `backend/` -> Node.js + Express + MongoDB Atlas (deploy to Render)

## Features

- Landing form fields: Name, Mobile Number, Preference
- Form flow:
  1. Frontend calls `POST /api/lead`
  2. Backend saves lead to MongoDB
  3. Frontend redirects to WhatsApp with pre-filled message
- Health endpoint: `GET /api/health`

## Required Environment Variables (Backend)

- `MONGO_URI`
- `WHATSAPP_NUMBER`
- `FRONTEND_URL`
- `NODE_ENV=production`

## Local Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:5001`

## Deployment

### Backend on Render

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`
- Add env vars: `MONGO_URI`, `WHATSAPP_NUMBER`, `FRONTEND_URL`, `NODE_ENV`

### Frontend on Vercel

- Root Directory: `frontend`
- Set env vars:
  - `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com`
  - `NEXT_PUBLIC_WHATSAPP_NUMBER=919999999999`
