# SwasthaLink — Complete Project Context

> **Purpose of this document:** Give any AI tool (or new contributor) full context about SwasthaLink so it can suggest features, implement code, review architecture, and understand every moving part without needing to re-explore the codebase.

---

## 1. Problem Statement

**40–80% of patients don't understand their hospital discharge instructions.**

This leads to:
- Incorrect medication usage (wrong dose, skipped drugs)
- Missed follow-up appointments
- Preventable hospital readmissions (costs $26B+ annually in the US alone)
- Patient anxiety, family confusion, and caregiver burden
- Language barriers — especially in India where discharge summaries are written in English medical jargon but patients speak regional languages

**SwasthaLink solves this** by converting clinical discharge summaries and prescriptions into plain, everyday language that patients and families actually understand — in both English and Bengali — and delivering it via WhatsApp.

---

## 2. What SwasthaLink Does (Feature Map)

### 2.1 Core Discharge Summary Pipeline
| Step | What Happens |
|------|-------------|
| **Input** | Doctor pastes or uploads (OCR) a discharge summary |
| **Simplification** | LLM converts medical jargon → plain English + Bengali |
| **Role Tailoring** | Language adapts for Patient / Caregiver / Elderly audience |
| **Medication Cards** | Each drug shown with everyday name, dose, timing, and reason |
| **Risk Scoring** | Readmission risk computed (0–100) based on medications, warnings, role, quiz |
| **Comprehension Quiz** | 3 MCQs auto-generated; if patient scores < 2/3 → ultra-simple re-explanation |
| **WhatsApp Delivery** | Summary sent to patient's phone via Twilio |
| **Follow-up Nudges** | Day-3 and Day-7 automated check-in messages |
| **Share Link** | Tokenized URL for caregivers/family (30-day expiry, no login needed) |

### 2.2 Prescription RAG Pipeline (Doctor → Admin → Patient)
| Step | What Happens |
|------|-------------|
| **Upload** | Doctor uploads handwritten prescription (JPG/PDF) |
| **Image Preprocessing** | OpenCV CLAHE contrast + Gaussian denoise |
| **OCR** | LlamaCloud or Groq Vision extracts raw text |
| **RAG Extraction** | Knowledge-base snippets + LLM → structured data (meds, tests, diagnosis, doctor, patient) |
| **Admin Review** | Admin dashboard shows pending prescriptions → approve or reject |
| **Patient Insights** | On approval, LLM generates plain-language medication guide, test guide, health summary, dos & don'ts |
| **Patient View** | Family dashboard shows approved prescriptions with insights |

### 2.3 AI Chatbot (RAG-grounded)
- Patient asks questions about their prescription/medications
- System retrieves relevant chunks from approved prescription data
- Groq LLM answers with strict no-hallucination policy
- Bilingual responses (English + Bengali)

### 2.4 Drug Interaction Checker
- Takes a list of medications
- LLM analyzes pairwise interactions
- Returns severity, mechanism, and recommendation

### 2.5 Role-Based Dashboards

| Role | Dashboard | Key Features |
|------|-----------|-------------|
| **Patient** | Family Dashboard | PID linking, medication list, test recommendations, health summary, chatbot, discharge history, WhatsApp share |
| **Doctor** | Doctor Panel | Prescription upload, report type selector, auto-generated Patient ID, extraction results, share link, daily CSV export |
| **Admin** | Admin Panel | Prescription review queue, approve/reject workflow, rejection reason, audit log |

### 2.6 3D Visualizations
- **Pulsating Heart** — BPM-driven heartbeat (Three.js + React Three Fiber)
- **DNA Double Helix** — Animated with base pairs
- **Floating Medical Cube** — Metric overlay with value/label

### 2.7 Charts & Analytics
- Vital Signs (multi-line: heart rate + BP over time)
- Comprehension Score (bar chart with benchmark)
- Processing Status (doughnut: completed/processing/pending/failed)
- Readmission Risk (line chart vs industry average)
- Risk Gauge (SVG 0–100 with green/yellow/red zones)

---

## 3. Architecture

### 3.1 High-Level Stack

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND (Vercel)                                  │
│  React 18 + Vite + TailwindCSS v4                   │
│  Three.js (3D) + Chart.js + Framer Motion + GSAP    │
│  AuthContext → JWT stored in localStorage            │
│  VITE_API_URL → backend                             │
├─────────────────────────────────────────────────────┤
│  BACKEND (Render)                                   │
│  FastAPI + Uvicorn (Python 3.11)                    │
│  LLM: Groq (llama-3.3-70b) + Qwen (OpenRouter)     │
│  Vision: Groq (llama-4-scout-17b)                   │
│  WhatsApp: Twilio API                               │
│  OTP: Twilio Verify                                 │
│  Jobs: APScheduler (Day-3/Day-7 nudges)             │
│  Auth: bcrypt + JWT (HS256, 24h)                    │
├─────────────────────────────────────────────────────┤
│  DATABASE (Supabase — plain Postgres, not Auth)     │
│  Tables: profiles, prescriptions, sessions,         │
│  session_history, session_events, discharge_results,│
│  share_tokens, followup_messages, patient_chunks    │
├─────────────────────────────────────────────────────┤
│  FILE STORAGE (AWS S3)                              │
│  Prescription images, 24-hour auto-delete lifecycle │
│  Pre-signed URLs (1-hour expiry)                    │
└─────────────────────────────────────────────────────┘
```

### 3.2 Zero-PHI Design
```
Clinical text → RAM only → LLM API → Response → RAM → Client
(Never written to disk or database)

Supabase stores ONLY: session_id, role, timestamp, quiz_score
(NO clinical text, NO patient names, NO PHI in sessions table)

session_history table stores full context but is opt-in via STORE_FULL_HISTORY env
```

### 3.3 LLM Fallback Chain
```
Primary:   Groq (llama-3.3-70b-versatile)
Fallback:  Groq (llama-3.1-8b-instant)
Secondary: Qwen (qwen3.6-plus:free via OpenRouter)

Vision:    Groq (llama-4-scout-17b-16e-instruct)
```

---

## 4. Directory Structure

```
SwasthaLink/
├── src/                          # React frontend
│   ├── App.jsx                   # Router & route definitions
│   ├── main.jsx                  # Entry point
│   ├── styles.css                # Tailwind + custom CSS
│   ├── components/
│   │   ├── AppShell.jsx          # Nav shell, sidebar, header
│   │   ├── ProtectedRoute.jsx    # Auth + role guard
│   │   ├── ChatbotPanel.jsx      # AI chatbot sidebar
│   │   ├── MedicalHeart3D.jsx    # 3D heart visualization
│   │   ├── DNA3DHelix.jsx        # 3D DNA helix
│   │   ├── FloatingMedicalCube.jsx
│   │   ├── VitalSignsChart.jsx
│   │   ├── ComprehensionScoreChart.jsx
│   │   ├── ProcessingStatusDoughnut.jsx
│   │   ├── ReadmissionRiskChart.jsx
│   │   ├── RiskGauge.jsx         # SVG 0-100 gauge
│   │   ├── Logo.jsx
│   │   └── ErrorBoundary.jsx
│   ├── pages/
│   │   ├── LandingPage.jsx       # Public home
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── ForgotPasswordPage.jsx
│   │   ├── ClarityHubPage.jsx    # Authenticated overview
│   │   ├── DetailedClarityHubPage.jsx
│   │   ├── FamilyDashboardPage.jsx  # Patient dashboard
│   │   ├── DoctorPanelPage.jsx
│   │   ├── AdminPanelPage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── ComponentShowcasePage.jsx
│   ├── services/
│   │   └── api.js                # All API calls (fetch wrapper)
│   ├── context/
│   │   └── AuthContext.jsx       # Auth state + JWT management
│   └── utils/
│       ├── config.js             # API_BASE_URL, endpoints, constants
│       ├── chartConfig.js        # Chart.js theme
│       ├── animations.js         # Framer Motion presets
│       └── auth.js               # Auth helpers
├── backend/
│   ├── main.py                   # FastAPI entrypoint
│   ├── routes/
│   │   ├── health.py             # GET /api/health
│   │   ├── discharge.py          # POST /api/process, /api/quiz/submit, /api/upload
│   │   ├── whatsapp.py           # POST /api/send-whatsapp
│   │   ├── auth.py               # /api/auth/login, signup, me, otp, password reset
│   │   ├── prescriptions.py      # Full prescription CRUD + approve/reject
│   │   ├── doctor.py             # GET /api/doctor/daily-summary
│   │   ├── patient.py            # PID linking, profile
│   │   └── analytics.py          # Stats, rate alerts, session history
│   ├── services/
│   │   ├── llm_service.py        # Groq + Qwen LLM calls, OCR, discharge processing
│   │   ├── twilio_service.py     # WhatsApp send, follow-up scheduler
│   │   ├── prescription_rag_service.py  # OCR → RAG → extract → admin workflow
│   │   ├── image_preprocessor.py # OpenCV CLAHE + denoise
│   │   ├── patient_insights_service.py  # Post-approval plain-language guides
│   │   ├── risk_scoring.py       # 0-100 readmission risk
│   │   ├── s3_service.py         # AWS S3 upload, presigned URLs
│   │   ├── rate_alert_service.py # Usage tracking + logging alerts
│   │   ├── rate_limiter_service.py # Per-key rate limiting
│   │   ├── otp_service.py        # Twilio OTP send/verify
│   │   ├── llamacloud_service.py # LlamaCloud PDF extraction
│   │   ├── groq_chat_service.py  # Chatbot via Groq
│   │   ├── chatbot_context_service.py  # RAG context builder
│   │   ├── data_chunker_service.py     # Prescription → retrieval chunks
│   │   └── payload_transformer.py      # Multi-layer data transform
│   ├── models/
│   │   ├── discharge.py          # ProcessRequest, ProcessResponse, Quiz models
│   │   ├── prescription.py       # Full prescription type hierarchy
│   │   ├── auth.py               # Login, Signup, OTP, Password reset
│   │   ├── common.py             # RoleEnum, LanguageEnum, HealthResponse
│   │   └── whatsapp.py           # WhatsAppRequest/Response
│   ├── db/
│   │   ├── supabase_service.py   # Session CRUD, share tokens, analytics
│   │   ├── prescription_db.py    # Prescription CRUD
│   │   ├── profile_db.py         # Patient PID linking, user lookup
│   │   ├── patient_chunks_db.py  # Chunked data store/retrieve
│   │   ├── audit_db.py           # Admin action audit log
│   │   └── supabase_schema.sql   # Full DDL
│   ├── auth/
│   │   ├── auth_service.py       # Login/signup logic, bcrypt
│   │   └── jwt_utils.py          # JWT create/verify
│   ├── ai/
│   │   └── prompts.py            # All LLM prompt templates
│   ├── core/
│   │   ├── config.py             # CORS origins, env readers
│   │   └── exceptions.py         # Custom exception hierarchy
│   └── tests/                    # pytest suite
├── infra/k8s/                    # Kubernetes manifests (base + overlays)
├── .github/workflows/            # CI/CD pipelines
├── sample_data/                  # Demo discharge summaries
├── public/                       # Static assets
├── supabase_schema.sql           # Root-level schema copy
├── Dockerfile.frontend           # React → nginx
├── backend/Dockerfile            # FastAPI container
├── package.json                  # Frontend deps
├── vite.config.js                # Vite config
├── tailwind.config.js            # Tailwind config
└── VERCEL_RENDER_DEPLOYMENT_GUIDE.md
```

---

## 5. Complete API Endpoint Map

### 5.1 Health & Root
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | API info + version |
| GET | `/api/health` | No | Health check (LLM, Twilio, Supabase, S3) |

### 5.2 Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login → JWT token |
| POST | `/api/auth/signup` | No | Create account |
| GET | `/api/auth/me` | JWT | Verify session, return profile |
| POST | `/api/auth/send-otp` | No | Send OTP via WhatsApp/SMS |
| POST | `/api/auth/verify-otp` | No | Verify OTP code |
| POST | `/api/auth/forgot-password` | No | Request password reset OTP |
| POST | `/api/auth/reset-password` | No | Reset password with OTP |

### 5.3 Discharge Processing (Core)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/process` | No | Simplify discharge summary → English + Bengali + quiz + risk |
| POST | `/api/quiz/submit` | No | Submit quiz answers → score + re-explain trigger |
| POST | `/api/upload` | No | Upload PDF/image → OCR text extraction |
| GET | `/api/patient/{patient_id}/history` | No | Patient's discharge history |
| GET | `/api/share/{token}` | No | Public caregiver view (tokenized) |

### 5.4 WhatsApp
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/send-whatsapp` | No | Send WhatsApp message via Twilio |
| GET | `/api/whatsapp/sandbox-instructions` | No | Sandbox join guide |

### 5.5 Prescriptions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/prescriptions/extract` | No | Upload + OCR + RAG extract prescription |
| GET | `/api/prescriptions/pending` | No | Admin: pending prescriptions |
| GET | `/api/prescriptions/all` | No | Admin: all prescriptions |
| GET | `/api/prescriptions/by-doctor/{id}` | No | Doctor's prescriptions |
| GET | `/api/prescriptions/for-patient/{id}` | No | Approved prescriptions for patient |
| POST | `/api/prescriptions/{id}/approve` | No | Admin approves → triggers insights |
| POST | `/api/prescriptions/{id}/reject` | No | Admin rejects with reason |

### 5.6 Doctor & Patient
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/doctor/daily-summary` | No | Doctor's daily activity report |
| POST | `/api/patient/link-pid` | No | Link system PID to user |
| GET | `/api/patient/profile` | No | Get linked PID + profile |

### 5.7 Analytics
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/analytics` | No | Aggregated session stats |
| GET | `/api/rate-alerts/status` | No | Rate limiter status |
| GET | `/api/sessions/{id}/history` | No | Full history for session |
| GET | `/api/sessions/history/recent` | No | Recent sessions (paginated) |
| GET | `/api/sessions/count` | No | Total session count |
| GET | `/api/patients` | No | Patient directory |

### 5.8 Utility
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/drug-interactions` | No | Check medication interactions |

---

## 6. Data Models (Pydantic)

### 6.1 Discharge
```
ProcessRequest:
  discharge_text: str (50–10,000 chars)
  role: "patient" | "caregiver" | "elderly"
  language: "en" | "bn" | "both"
  re_explain: bool (optional)
  previous_simplified: str (optional)
  patient_id: str (optional)
  doctor_id: str (optional)

ProcessResponse:
  simplified_english: str
  simplified_bengali: str
  medications: Medication[]
  follow_up: str
  warning_signs: str[]
  comprehension_questions: ComprehensionQuestion[3]
  whatsapp_message: str
  session_id: str
  risk_score: int (0-100)
  risk_level: "low" | "moderate" | "high"
  share_token: str

Medication:
  name, dose, timing, reason, important: str

ComprehensionQuestion:
  question: str
  options: str[4]
  correct: int (0-3)
  explanation: str
```

### 6.2 Prescription
```
PrescriptionMedication:
  name, strength, form, frequency, duration, instructions, purpose: str
  schedule: DosageSchedule (morning/afternoon/evening/night: bool)
  warnings: str[]

PrescriptionExtractedData:
  doctor_name, patient_id, patient_name, patient_age, patient_gender: str
  prescription_date: str
  medications: PrescriptionMedication[]
  tests: PrescriptionTest[]
  diagnosis, notes: str
  extraction_confidence: float (0.0–1.0)
  report_type: str
  raw_ocr_text: str
  patient_insights: PatientInsights (nullable)

PatientInsights:
  medication_guide: [{name, what, why, when, caution}]
  test_guide: [{name, why, what_to_expect}]
  health_summary: str
  dos_and_donts: str

PrescriptionRecord:
  prescription_id, status, doctor_id, extracted_data, s3_key,
  created_at, admin_id, reviewed_at, rejection_reason
```

### 6.3 Auth
```
AuthLoginRequest: role, email, password
AuthLoginResponse: success, message, user, access_token, is_demo
SignupRequest: name, email, password, phone, role
Roles: patient, doctor, admin, caregiver, elderly
```

---

## 7. Database Schema (Supabase PostgreSQL)

### Tables

**profiles** — User accounts
```sql
id SERIAL PK, user_id UUID UNIQUE, email TEXT UNIQUE, full_name TEXT,
role TEXT, phone TEXT, phone_verified BOOLEAN DEFAULT false,
password_hash TEXT, pid TEXT, created_at TIMESTAMPTZ
```

**prescriptions** — Extracted prescriptions
```sql
prescription_id UUID PK, status TEXT DEFAULT 'pending_admin_review',
doctor_id TEXT, patient_id TEXT, medications JSONB, tests JSONB,
extraction_confidence REAL, s3_key TEXT, patient_insights JSONB,
admin_id TEXT, reviewed_at TIMESTAMPTZ, rejection_reason TEXT,
report_type TEXT, created_at TIMESTAMPTZ
```

**sessions** — Activity metadata (no PHI)
```sql
id TEXT PK (session_id), role TEXT, language TEXT,
quiz_score INT, whatsapp_sent BOOLEAN, re_explained BOOLEAN,
created_at TIMESTAMPTZ
```

**session_history** — Full clinical context (opt-in)
```sql
session_id TEXT, role TEXT, language TEXT, discharge_text TEXT,
simplified_english TEXT, simplified_bengali TEXT, medications JSONB,
follow_up TEXT, warning_signs JSONB, comprehension_questions JSONB,
whatsapp_message TEXT, re_explain BOOLEAN, created_at TIMESTAMPTZ
```

**session_events** — Timeline events
```sql
session_id TEXT, event_type TEXT, event_data JSONB, created_at TIMESTAMPTZ
```

**discharge_results** — Processed summaries
```sql
patient_id TEXT, doctor_id TEXT, simplified_english TEXT,
simplified_bengali TEXT, medications JSONB, follow_up TEXT,
warning_signs JSONB, quiz_questions JSONB, risk_score INT,
risk_level TEXT, created_at TIMESTAMPTZ
```

**share_tokens** — Caregiver access links
```sql
token TEXT PK, session_id TEXT, patient_id TEXT,
expires_at TIMESTAMPTZ (30 days), created_at TIMESTAMPTZ
```

**followup_messages** — Scheduled WhatsApp jobs
```sql
session_id TEXT, patient_id TEXT, phone_number TEXT,
scheduled_for TIMESTAMPTZ, message_text TEXT, status TEXT,
sent_at TIMESTAMPTZ, twilio_sid TEXT, error TEXT
```

**patient_chunks** — RAG retrieval chunks
```sql
patient_id TEXT, chunk_type TEXT (medication/routine/explanation/faq_context),
chunk_data JSONB, created_at TIMESTAMPTZ
```

---

## 8. Key Data Flows

### 8.1 Discharge Processing (End-to-End)
```
User Input (text + role + language)
  → POST /api/process
    → llm_service.process_discharge_summary()
      → Format role-specific master prompt (ai/prompts.py)
      → Call Groq LLM (fallback: Qwen → Groq-small)
      → Parse JSON response
      → Validate 3 MCQs
    → risk_scoring.compute_risk_score()
    → supabase_service.log_session()
    → supabase_service.persist_session_history()
    → supabase_service.create_share_token()
    → twilio_service.schedule_followup_messages() (Day-3, Day-7)
  → Return ProcessResponse to frontend
    → Display simplified text, med cards, risk gauge, quiz
```

### 8.2 Quiz & Re-Explanation
```
User answers 3 MCQs
  → POST /api/quiz/submit
    → Score calculated
    → If score < 2/3: needs_re_explain = true
      → Frontend calls POST /api/process with re_explain=true
        → LLM uses RE_EXPLANATION_PROMPT
        → Ultra-simple language, household analogies, sub-8-word sentences
```

### 8.3 Prescription Pipeline
```
Doctor uploads image
  → POST /api/prescriptions/extract
    → image_preprocessor (CLAHE + denoise)
    → LlamaCloud or Groq Vision (OCR)
    → prescription_rag_service.retrieve_context() (knowledge snippets)
    → prescription_rag_service.extract_prescription_data() (LLM structured extraction)
    → S3 upload (24h auto-delete)
    → prescription_db.create() (status: pending_admin_review)

Admin reviews
  → POST /api/prescriptions/{id}/approve
    → patient_insights_service.generate_insights()
    → data_chunker_service.chunk_and_store()
    → prescription_db.approve()

Patient views
  → GET /api/prescriptions/for-patient/{pid}
    → Returns approved prescriptions with insights
```

### 8.4 Chatbot Query
```
Patient asks question
  → chatbot_context_service.build_context(patient_id, query)
    → Retrieve relevant chunks from patient_chunks
  → groq_chat_service.generate_response(query, context)
    → Groq LLM with no-hallucination policy
  → Return plain-language answer
```

---

## 9. Authentication System

- **No Supabase Auth** — uses Supabase as plain Postgres only
- Passwords hashed with **bcrypt** (supports legacy pbkdf2_sha256 for migration)
- JWT tokens: **HS256**, 24-hour expiry, contains `user_id`, `email`, `role`, `name`
- Stored in **localStorage** on frontend
- Session restored on page reload via `GET /api/auth/me`
- OTP verification via **Twilio Verify** (WhatsApp or SMS channel)
- `ProtectedRoute` component enforces `isAuthenticated` + `allowedRoles`

### Roles
| Role | Access |
|------|--------|
| `patient` | Family Dashboard, chatbot, prescription view |
| `doctor` | Doctor Panel, prescription upload, daily summary |
| `admin` | Admin Panel, approve/reject prescriptions |
| `caregiver` | Share link access (no login needed) |
| `elderly` | Same as patient but with simpler language |

---

## 10. Risk Scoring Algorithm

```python
score = 0
score += (3 - quiz_score) * 10          # Max 30 (worse quiz = higher risk)
score += min(medication_count * 5, 30)   # Max 30 (polypharmacy = higher risk)
score += min(warning_sign_count * 8, 25) # Max 25 (more warnings = higher risk)

if role == "elderly":
    score += 15                          # Age vulnerability
elif role == "patient":
    score += 5                           # Self-care burden

score = min(score, 100)

risk_level:
  score < 35  → "low"
  score 35-65 → "moderate"
  score > 65  → "high"
```

---

## 11. AI Prompt Templates

All prompts live in `backend/ai/prompts.py`:

| Prompt | Purpose |
|--------|---------|
| `ROLE_INSTRUCTIONS` | Language complexity per role (patient/caregiver/elderly) |
| `MASTER_SIMPLIFICATION_PROMPT` | Core discharge → plain-language JSON conversion |
| `RE_EXPLANATION_PROMPT` | Ultra-simple re-explanation (sub-8-word sentences, household analogies) |
| `OCR_EXTRACTION_PROMPT` | Image → text |
| `BENGALI_VALIDATION_PROMPT` | Everyday vs formal Bengali check |
| `MEDICATION_EXTRACTION_PROMPT` | Free-text → structured medication list |
| `DRUG_INTERACTION_PROMPT` | Pairwise drug interaction analysis |
| `SYSTEM_INSTRUCTION` | System instruction for LLM initialization |

---

## 12. Frontend Routing

```
/                    → LandingPage (public)
/login               → LoginPage
/signup              → SignupPage
/forgot-password     → ForgotPasswordPage
/overview            → ClarityHubPage (auth required, role-aware)
/clarity-hub         → DetailedClarityHubPage
/family-dashboard    → FamilyDashboardPage (patient only)
/patient-panel       → Redirect → /family-dashboard
/admin-panel         → AdminPanelPage (admin only)
/doctor-panel        → DoctorPanelPage (doctor only)
/showcase            → ComponentShowcasePage (demo)
/settings            → SettingsPage
/share/{token}       → Public caregiver dashboard (no auth)
*                    → Redirect → /
```

---

## 13. Tech Stack Summary

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3 | UI framework |
| Vite | 5.4 | Build tool |
| TailwindCSS | 4.2 | Styling |
| React Router | 6.30 | Routing |
| Three.js | 0.183 | 3D visualizations |
| React Three Fiber | 8.18 | Three.js React bindings |
| React Three Drei | 9.122 | Three.js helpers |
| Chart.js | 4.5 | Charts |
| React-ChartJS-2 | 5.3 | Chart.js React bindings |
| Framer Motion | 12.38 | Animations |
| GSAP | 3.14 | Advanced animations |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.111+ | API framework |
| Uvicorn | 0.30+ | ASGI server |
| Pydantic | 2.10+ | Data validation |
| OpenAI SDK | 1.52+ | Groq/Qwen LLM client |
| Twilio | 9.0+ | WhatsApp + OTP |
| Supabase | 2.8.1 | PostgreSQL client |
| boto3 | 1.34+ | AWS S3 |
| PyJWT | 2.8+ | JWT tokens |
| bcrypt | 4.0+ | Password hashing |
| APScheduler | 3.10+ | Background jobs |
| OpenCV | 4.10+ | Image preprocessing |
| Pillow | 10.0+ | Image manipulation |
| httpx | 0.27.2 | Async HTTP |
| LlamaCloud | 2.1+ | PDF/prescription extraction |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Vercel | Frontend hosting |
| Render | Backend hosting |
| Supabase | PostgreSQL database |
| AWS S3 | File storage (24h auto-delete) |
| Twilio | WhatsApp messaging + OTP |
| Groq | Primary LLM (llama-3.3-70b) |
| OpenRouter | Secondary LLM (Qwen) |

---

## 14. Environment Variables

### Backend (Render)
```env
# LLM
QWEN_API_KEY=                     # OpenRouter key
QWEN_BASE_URL=https://openrouter.ai/api/v1
QWEN_MODEL_NAME=qwen/qwen3.6-plus:free
GROQ_API_KEY=                     # Groq key
GROQ_MODEL=llama-3.3-70b-versatile

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=
TWILIO_VERIFY_SERVICE_SID=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Supabase
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Optional

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
S3_BUCKET_NAME=

# App
FRONTEND_URL=                     # Vercel URL (for CORS)
ENVIRONMENT=production
DEBUG=false
JWT_SECRET=                       # Strong random secret
STORE_FULL_HISTORY=true

# Rate Alerts
RATE_ALERTS_ENABLED=true
RATE_ALERT_THRESHOLD_PERCENT=80
RATE_ALERT_LLM_DAILY_LIMIT=1000
RATE_ALERT_TWILIO_DAILY_LIMIT=500
RATE_ALERT_SUPABASE_DAILY_LIMIT=5000
RATE_ALERT_S3_DAILY_LIMIT=1000
```

### Frontend (Vercel)
```env
VITE_API_URL=https://<render-service>.onrender.com
```

---

## 15. Deployment

- **Frontend:** Vercel → imports repo root, Vite preset, `npm run build` → `dist/`
- **Backend:** Render → root dir `backend/`, Python 3.11, `pip install -r requirements.txt`, `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **CORS:** Backend reads `FRONTEND_URL` for allow-list. Must match exact Vercel URL.
- **Free Tier:** UptimeRobot pings `/api/health` every 5–10 min to prevent Render sleep.
- **CI/CD:** GitHub Actions — `.github/workflows/ci.yml` → `ci-reusable.yml` → `cd.yml`
- **K8s:** Kustomize base + staging/production overlays at `infra/k8s/`

---

## 16. Testing

- **Backend:** `cd backend && pytest` (unit + integration tests)
- **E2E:** `python e2e_test.py` (doctor → admin → patient full flow)
- **Test files:** `backend/tests/test_auth.py`, `test_health.py`, `test_discharge.py`, `test_rate_limiter.py`, `test_supabase_service.py`, `test_chatbot_context_service.py`, `test_llamacloud_service.py`

---

## 17. Current Limitations & Known Gaps

1. **Most endpoints lack JWT auth enforcement** — many routes are currently open (no `get_current_user` dependency)
2. **Bengali is the only second language** — no support for Hindi, Tamil, etc.
3. **No WebSocket/SSE** — chatbot and processing are request-response only
4. **No caching layer** — repeated identical discharge texts hit LLM every time
5. **No real-time notifications** — admin has to manually refresh for new prescriptions
6. **S3 images auto-delete in 24h** — no permanent prescription image storage
7. **APScheduler is in-memory** — follow-up jobs lost on Render redeploy/restart
8. **No pagination** on several list endpoints
9. **No rate limiting on routes** — rate_limiter_service exists but isn't middleware
10. **Share tokens don't verify expiry** on some code paths

---

## 18. Sample Data

Available in `sample_data/` for testing:
- `demo_summary.txt` — Complex cardiac case (58yo, MI, 12 drugs, diabetes)
- `simple_discharge.txt` — Basic outpatient (pneumonia)
- `post_surgery.txt` — Post-surgical recovery

---

## 19. Key Design Decisions

1. **Supabase as plain Postgres** — not using Supabase Auth, GoTrue, or RLS policies
2. **Groq over OpenAI** — free tier, fast inference, open-source models
3. **Qwen as fallback** — free via OpenRouter if Groq is down
4. **bcrypt + PyJWT** — simple, standard auth without external auth providers
5. **APScheduler** — lightweight background jobs without Redis/Celery
6. **Zero-PHI sessions** — only metadata logged, clinical text stays in RAM
7. **24h S3 lifecycle** — prescriptions images auto-cleaned for privacy
8. **Patient ID auto-generation** — `PID-XXXXXX` assigned by doctor, patient links it to their account later
