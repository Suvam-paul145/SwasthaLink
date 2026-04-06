# SwasthaLink Deployment Guide (Vercel + Render)

Step-by-step guide to deploy the **React frontend on Vercel** and the **FastAPI backend on Render**.

---

## 1) Architecture overview

| Layer | Platform | Directory | Start command |
|-------|----------|-----------|---------------|
| Frontend (React + Vite) | **Vercel** | repo root (`.`) | `npm run build` → `dist/` |
| Backend (FastAPI) | **Render** | `backend/` | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

Key wiring:
- Frontend reads `VITE_API_URL` (set in Vercel) to call the backend.
- Backend reads `FRONTEND_URL` (set in Render) for CORS allow-list.

---

## 2) Deploy backend to Render

### 2.1 — Push code to GitHub

Make sure your `testing` branch is up to date and pushed.

### 2.2 — Create a Render Web Service

1. Go to [https://render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo: `Suvam-paul145/SwasthaLink`
3. Configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |
| **Runtime** | Python |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

### 2.3 — Set backend environment variables

Add these in the Render dashboard under **Environment**:

**Required:**

| Variable | Description |
|----------|-------------|
| `QWEN_API_KEY` | OpenRouter API key for Qwen model |
| `QWEN_BASE_URL` | `https://openrouter.ai/api/v1` |
| `QWEN_MODEL_NAME` | `qwen/qwen3.6-plus:free` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` (sandbox) |
| `TWILIO_API_KEY_SID` | Twilio API Key SID |
| `TWILIO_API_KEY_SECRET` | Twilio API Key Secret |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify Service SID |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Supabase anon/public key |
| `FRONTEND_URL` | Your Vercel URL (set after frontend deploy) |
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |
| `JWT_SECRET` | A strong random secret for JWT signing |
| `GROQ_API_KEY` | Groq API key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` |

**Optional (if using S3 uploads):**

| Variable | Description |
|----------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_REGION` | e.g. `ap-south-1` |
| `S3_BUCKET_NAME` | Your S3 bucket name |

**Optional (rate alert tuning):**

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_ALERTS_ENABLED` | `true` | Enable usage tracking |
| `RATE_ALERT_THRESHOLD_PERCENT` | `80` | Alert threshold % |
| `RATE_ALERT_LLM_DAILY_LIMIT` | `1000` | Daily LLM call limit |
| `RATE_ALERT_TWILIO_DAILY_LIMIT` | `500` | Daily Twilio call limit |
| `RATE_ALERT_SUPABASE_DAILY_LIMIT` | `5000` | Daily Supabase call limit |
| `RATE_ALERT_S3_DAILY_LIMIT` | `1000` | Daily S3 call limit |

### 2.4 — Deploy and verify

After the deploy completes, check:

- `https://<your-render-service>.onrender.com/api/health`
- `https://<your-render-service>.onrender.com/docs` (Swagger UI)

If health shows `degraded`, fix any missing env vars first.

---

## 3) Deploy frontend to Vercel

### 3.1 — Create a Vercel project

1. Go to [https://vercel.com](https://vercel.com) → **New Project**
2. Import `Suvam-paul145/SwasthaLink`
3. Configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `.` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### 3.2 — Set frontend environment variable

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://<your-render-service>.onrender.com` |

> Redeploy if you add or change env vars after the first deployment.

### 3.3 — Verify frontend

Open your Vercel URL and check:

- Pages load correctly
- API calls succeed (no CORS errors in console)
- Login, discharge processing, and WhatsApp flows work end-to-end

---

## 4) Final CORS sync (critical)

After Vercel gives you a URL:

1. Go back to **Render** → your service → **Environment**
2. Set `FRONTEND_URL=https://<your-vercel-app>.vercel.app`
3. **Redeploy** the backend

This is required because the backend CORS allow-list reads `FRONTEND_URL`.

---

## 5) Post-deploy checklist

- [ ] Backend `/api/health` returns `ok` or expected `degraded`
- [ ] Frontend loads and can call backend without CORS errors
- [ ] Twilio WhatsApp sandbox joined and test message delivered
- [ ] Supabase queries working (login, data storage)
- [ ] (If used) S3 upload works

---

## 6) Keep Render free tier alive

Free-tier Render services sleep after 15 minutes of inactivity. Use an uptime monitor (e.g. UptimeRobot, cron-job.org) to ping:

```
https://<your-render-service>.onrender.com/api/health
```

every 5–10 minutes.

---

## 7) Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error in browser console | Set `FRONTEND_URL` on Render to your exact Vercel URL, then redeploy |
| Backend health `degraded` | Check Render logs → usually a missing env var |
| Frontend shows blank / API errors | Verify `VITE_API_URL` in Vercel points to the Render URL (no trailing slash) |
| Twilio not sending | Ensure phone has joined sandbox; check `TWILIO_*` vars on Render |
| Render deploy fails on build | Check `backend/requirements.txt` is valid; Render needs Python 3.11+ |
