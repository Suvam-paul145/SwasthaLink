# SwasthaLink — Local Development Guide

Everything you need to clone, configure, and run the full stack on your machine.

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Node.js** | 20+ | `node -v` |
| **npm** | 10+ | `npm -v` |
| **Python** | 3.11+ | `python --version` |
| **pip** | latest | `pip --version` |
| **Git** | any | `git --version` |

> **Windows users:** Use PowerShell or Git Bash. All commands below work in both.
> **macOS/Linux users:** Replace `python` with `python3` and `pip` with `pip3` if needed.

---

## 1. Clone the Repository

```bash
git clone https://github.com/Suvam-paul145/SwasthaLink.git
cd SwasthaLink
git checkout testing
```

---

## 2. Backend Setup

### 2a. Create a virtual environment

```bash
cd backend

# Create venv
python -m venv venv

# Activate it
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# Windows (CMD):
.\venv\Scripts\activate.bat

# macOS / Linux:
source venv/bin/activate
```

### 2b. Install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### 2c. Configure environment variables

Create a file called **`backend/.env`** (this file is gitignored):

```dotenv
# ─── REQUIRED ────────────────────────────────────────────────
# At least one LLM key is needed for AI features
GROQ_API_KEY=your_groq_api_key_here

# Supabase (database)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
# OR use the anon key:
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT secret for auth tokens
JWT_SECRET=any-random-secret-string-min-32-chars

# ─── OPTIONAL (features degrade gracefully without these) ───
# Twilio (WhatsApp / OTP)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_VERIFY_SERVICE_SID=

# AWS S3 (file uploads)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
S3_BUCKET_NAME=

# LlamaCloud (RAG pipeline)
LLAMA_CLOUD_API_KEY=

# Groq chat (chatbot feature)
GROQ_CHAT_MODEL=llama-3.3-70b-versatile

# Qwen / OpenRouter (fallback LLM)
QWEN_API_KEY=
QWEN_BASE_URL=https://openrouter.ai/api/v1

# Frontend URL (for CORS — defaults to localhost:5173 in dev)
FRONTEND_URL=http://localhost:5173

# Misc
ENVIRONMENT=development
DEBUG=true
PORT=8000
```

> **Where to get keys:**
> - **Groq:** https://console.groq.com → API Keys
> - **Supabase:** https://supabase.com/dashboard → Project Settings → API
> - **Twilio:** https://console.twilio.com → Account Info
> - **AWS S3:** https://console.aws.amazon.com/iam → Security Credentials

### 2d. Run the backend

```bash
# Make sure you're in the backend/ directory with venv activated
python main.py
```

The API starts at **http://localhost:8000**. You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

### 2e. Verify it works

Open a new terminal:

```bash
curl http://localhost:8000/api/health
```

You should get a JSON response with status info. Some services may show `"unavailable"` if their env vars aren't set — that's fine for local dev.

---

## 3. Frontend Setup

Open a **new terminal** (keep the backend running):

```bash
# From the project root (SwasthaLink/)
npm install
```

### 3a. Configure frontend environment (optional)

Create a **`.env`** file in the project root:

```dotenv
# Points the frontend to your local backend
VITE_API_URL=http://localhost:8000

# Supabase (needed for auth UI)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> If you skip this file, the frontend defaults to `http://localhost:8000` for the API.

### 3b. Run the frontend

```bash
npm run dev
```

The app opens at **http://localhost:5173**. Vite hot-reloads on every file save.

---

## 4. Running Both Together (Summary)

You need **two terminals**:

| Terminal | Directory | Command | URL |
|----------|-----------|---------|-----|
| 1 — Backend | `backend/` | `python main.py` | http://localhost:8000 |
| 2 — Frontend | project root | `npm run dev` | http://localhost:5173 |

CORS is pre-configured to allow `localhost:5173` → `localhost:8000`.

---

## 5. Running Tests

### Backend tests

```bash
cd backend
pytest -ra --tb=short -v
```

To run a specific test file:

```bash
pytest tests/test_health.py -v
```

### Backend linting

```bash
cd backend
ruff check .
```

### Frontend linting

```bash
# From project root
npm run lint
```

Auto-fix lint issues:

```bash
npm run lint:fix
```

### Frontend build check

```bash
npm run build
```

---

## 6. Docker (Optional)

If you prefer running via Docker:

### Backend only

```bash
cd backend
docker build -t swasthalink-backend .
docker run -p 8000:8000 --env-file .env swasthalink-backend
```

### Frontend only

```bash
# From project root
docker build -f Dockerfile.frontend -t swasthalink-frontend .
docker run -p 80:80 swasthalink-frontend
```

### Both with Docker Compose

Create a `docker-compose.yml` in the project root:

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: ./backend/.env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "5173:80"
    depends_on:
      backend:
        condition: service_healthy
```

```bash
docker compose up --build
```

---

## 7. Project Structure Quick Reference

```
SwasthaLink/
├── src/                  # React frontend (Vite + TailwindCSS)
│   ├── components/       # Reusable UI components
│   ├── pages/            # Route-level pages
│   ├── services/         # API client (api.js)
│   └── utils/            # Config, helpers
├── backend/              # FastAPI backend
│   ├── main.py           # App entrypoint
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic (LLM, Twilio, S3, etc.)
│   ├── db/               # Database layer (Supabase)
│   ├── auth/             # JWT auth + OTP
│   ├── models/           # Pydantic request/response models
│   ├── ai/               # LLM prompt templates
│   └── tests/            # pytest test suite
├── .github/workflows/    # CI/CD pipelines
├── package.json          # Frontend dependencies + scripts
└── vite.config.js        # Vite configuration
```

---

## 8. Common Issues

### "CORS error" in browser console

Make sure the backend is running on port 8000 and you haven't changed `FRONTEND_URL`. The backend already allows `localhost:5173` and `localhost:3000` by default.

### "Module not found" when running backend

You're likely outside the virtual environment. Activate it:

```bash
# Windows
.\venv\Scripts\Activate.ps1
# macOS/Linux
source venv/bin/activate
```

### Backend starts but services show "unavailable"

That's expected if optional env vars (Twilio, S3, LlamaCloud) aren't set. Core features (discharge processing, auth) work with just `GROQ_API_KEY` + Supabase credentials.

### `npm run dev` fails with missing dependencies

```bash
rm -rf node_modules package-lock.json
npm install
```

### ESLint version errors

The project uses ESLint 9 with flat config. Make sure you run `npm install` from the project root (not from `src/`).

### Python version mismatch

The backend requires Python 3.11+. Check with `python --version`. If you have multiple Python versions, use `python3.11 -m venv venv` when creating the venv.

---

## 9. Useful Commands Cheat Sheet

| Task | Command | Directory |
|------|---------|-----------|
| Start backend | `python main.py` | `backend/` |
| Start frontend | `npm run dev` | root |
| Run backend tests | `pytest -ra -v` | `backend/` |
| Lint backend | `ruff check .` | `backend/` |
| Lint frontend | `npm run lint` | root |
| Fix frontend lint | `npm run lint:fix` | root |
| Build frontend | `npm run build` | root |
| Preview production build | `npm run preview` | root |

---

## 10. Getting API Keys for Full Functionality

| Service | Required? | Free Tier? | Sign Up |
|---------|-----------|------------|---------|
| **Groq** | Yes (for AI) | Yes — generous free tier | https://console.groq.com |
| **Supabase** | Yes (for DB/auth) | Yes — 2 free projects | https://supabase.com |
| **Twilio** | No (WhatsApp/OTP) | Trial account available | https://twilio.com |
| **AWS S3** | No (file uploads) | 12-month free tier | https://aws.amazon.com |
| **LlamaCloud** | No (RAG pipeline) | Free tier available | https://cloud.llamaindex.ai |
| **OpenRouter** | No (Qwen fallback) | Free models available | https://openrouter.ai |

> Start with just **Groq + Supabase** — everything else is optional and degrades gracefully.
