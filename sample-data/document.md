# SwasthaLink — Intelligent Medical Communication Platform

> *Bridging the gap between complex medical documents and patient understanding through AI-powered extraction, simplification, and role-based delivery.*

---

## 📋 Table of Contents

1. [Problem Statement](#-problem-statement)
2. [Why SwasthaLink is Required](#-why-swasthalink-is-required)
3. [Solution Architecture](#-solution-architecture)
4. [Unique Features](#-unique-features)
5. [Beneficiaries](#-beneficiaries)
6. [Technical Architecture](#-technical-architecture)
7. [Data Flow Pipeline](#-data-flow-pipeline)
8. [Extraction Consistency Engine](#-extraction-consistency-engine)
9. [Unified Data Schema](#-unified-data-schema)
10. [Role-Based Output System](#-role-based-output-system)
11. [Multi-Report Upload System](#-multi-report-upload-system)
12. [API Rate Limit Protection](#-api-rate-limit-protection)
13. [Security & Privacy](#-security--privacy)
14. [Roadmap](#-roadmap)
15. [Tech Stack](#-tech-stack)

---

## 🔴 Problem Statement

### The Healthcare Communication Crisis

In India and many developing nations, **over 60% of patients leave hospitals without fully understanding their discharge instructions or prescriptions**. This leads to:

- **Medication errors**: Patients take wrong doses or skip medications entirely because they cannot read handwritten prescriptions
- **Missed follow-ups**: Critical follow-up dates are buried in medical jargon
- **Emergency readmissions**: Warning signs are described in clinical language that patients and families cannot interpret
- **Language barriers**: Medical documents are written in English, but a significant portion of patients and their families communicate primarily in regional languages (Bengali, Hindi, etc.)
- **Caregiver helplessness**: Family members caring for patients receive zero structured guidance on what to monitor, when to give medicine, or when to rush to the emergency room

### The Prescription Readability Problem

Handwritten prescriptions remain the norm across Indian clinics and hospitals. These prescriptions suffer from:

- **Illegibility**: Doctors' handwriting is notoriously difficult to read, even for pharmacists
- **Inconsistent formatting**: No standardized structure — medications, tests, and notes are scattered
- **Information loss**: When prescriptions are manually transcribed, critical details like dosage timing, test recommendations, and warnings are frequently lost or misinterpreted
- **No digital trail**: Paper prescriptions cannot be tracked, linked to patient records, or referenced remotely by caregivers

### The Multi-Document Challenge

A patient's medical journey involves multiple document types:

- Prescriptions (handwritten and printed)
- ECG reports
- Echocardiography (Echo) reports
- CT Scan results
- MRI scans
- Blood test reports
- Discharge summaries

Currently, **no unified system** exists that can:
1. Accept all these document types from a doctor
2. Extract structured data from each
3. Link them to a single patient record
4. Present role-appropriate views to doctors, admins, and patients
5. Explain what each test means in simple, patient-friendly language

---

## 💡 Why SwasthaLink is Required

### 1. Patient Safety

Medication errors are one of the leading causes of preventable harm in healthcare. By digitizing and structuring prescriptions with AI, SwasthaLink eliminates the risk of misreading handwritten instructions.

### 2. Health Literacy

India's average health literacy rate is alarmingly low. SwasthaLink transforms clinical medical language into everyday language that patients and their families can understand — in **both English and Bengali**.

### 3. Caregiver Empowerment

Family members are often the primary caregivers. SwasthaLink provides them with:
- Clear medication schedules (what to give, when, with what)
- Warning signs to watch for
- Emergency action plans
- Follow-up reminders

### 4. Clinical Efficiency

Doctors spend significant time explaining prescriptions. SwasthaLink automates this by generating patient-friendly explanations directly from the extracted data, allowing doctors to focus on clinical care.

### 5. Administrative Oversight

Hospital administrators need to verify that AI-extracted data is accurate before it reaches patients. SwasthaLink provides a structured admin review queue with approval/rejection workflows.

### 6. Digital Health Infrastructure

SwasthaLink creates a digital foundation for patient records that can be:
- Accessed remotely by caregivers
- Shared with pharmacists
- Integrated with telemedicine platforms
- Used for longitudinal health tracking

---

## 🏗️ Solution Architecture

SwasthaLink is a **full-stack AI-powered medical communication platform** with three distinct user roles:

```
┌─────────────────────────────────────────────────────────────────┐
│                        SwasthaLink Platform                      │
├──────────────┬──────────────────┬────────────────────────────────┤
│  Doctor Panel │   Admin Panel    │        Patient Panel           │
│              │                  │                                │
│ • Upload Rx  │ • Review Queue   │ • Medication Guide             │
│ • Upload ECG │ • Approve/Reject │ • Test Explanations            │
│ • Upload MRI │ • History View   │ • Health Summary               │
│ • Upload CT  │ • Stats Monitor  │ • Warning Signs                │
│ • Side-by-   │ • Record Mgmt   │ • Do's & Don'ts                │
│   side view  │                  │ • Clarity Center + AI Chat     │
├──────────────┴──────────────────┴────────────────────────────────┤
│                     FastAPI Backend                               │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Image    │→│ Gemini    │→│ RAG      │→│ Patient Insights │   │
│  │ Preproc  │ │ OCR       │ │ Extract  │ │ Generation       │   │
│  │ (OpenCV) │ │ (t=0.0)   │ │ (t=0.0)  │ │ (on approval)    │   │
│  └──────────┘ └───────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Unified Data Schema (SQLite / Supabase)                   │   │
│  │ prescriptions + tests + insights + linked_reports         │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ API Rate Limiter — Gemini quota guard with console alerts │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⭐ Unique Features

### 1. 🧠 Deterministic AI Extraction Engine
- **Image preprocessing pipeline**: Orientation correction, CLAHE contrast enhancement, Gaussian denoising, adaptive binarization using OpenCV
- **Temperature 0.0 extraction**: Same image always produces same output — verified across 3+ runs
- **RAG (Retrieval-Augmented Generation)**: Knowledge snippets guide Gemini to recognize prescription-specific patterns
- **Multi-attempt with fallback**: Gemini attempt → retry with reinforced prompt → regex fallback — never loses data
- **Post-processing normalization**: Frequency codes (OD/BD/TDS) → human-readable; medication names → Title Case; deduplication

### 2. 📋 Unified Structured Schema
Single source of truth for all extracted data:
- Patient demographics
- Doctor information
- Medications with structured dosage schedules (morning/afternoon/evening/night)
- Medical tests with urgency classification
- Diagnosis and clinical notes
- Patient-friendly insights (generated on admin approval)
- Raw OCR text preserved for audit

### 3. 🎭 Role-Based Output Transformation
**Same data → Three different presentations:**

| Field | Doctor View | Admin View | Patient View |
|-------|-------------|------------|-------------|
| Medication | `Tab Metformin 500mg BD` | Same + confidence score | "Sugar tablet — take 1 in morning, 1 at night, after food" |
| Test | `ECG — rule out arrhythmia` | Same + urgency flag | "Heart rhythm test — painless, takes 5 minutes" |
| Diagnosis | `Type 2 DM with HTN` | Same | "You have high blood sugar and high blood pressure" |
| Warning | `Monitor for hypoglycemia` | Same | "If you feel very dizzy, shaky, or sweaty — eat something sweet and call your doctor" |

### 4. 📎 Multi-Report Upload & Linking
- Doctors can upload: Prescriptions, ECG, Echo, CT Scan, MRI, Blood Tests
- Each report is individually processed and extracted
- All reports for a patient are **linked** to the original prescription record
- Complete patient medical timeline in one view

### 5. 🗣️ Bilingual AI Assistant (Clarity Center)
- Patient-facing AI chatbot in English + Bengali
- Quick actions: Medication plan, Diet tips, Danger signs, Follow-up dates
- Voice assistant with bilingual speech support
- Contextual responses based on actual prescription data

### 6. 🛡️ API Rate Limit Protection
- Real-time tracking of Gemini API usage (per-minute and per-day)
- Automatic request blocking BEFORE hitting rate limits
- Console alerts with clear messages for API key rotation
- Configurable thresholds with budget-aware limits

### 7. 💚 WhatsApp Integration
- One-click prescription summary delivery via WhatsApp
- Formatted with emojis and bold text for readability
- Caregiver-friendly summaries

### 8. 📊 3D Medical Visualizations
- Interactive 3D heart model with real-time BPM animation
- DNA helix visualization
- Floating medical data cubes
- Chart.js powered analytics dashboards

### 9. 🎯 Comprehension Verification
- Auto-generated quiz after each prescription simplification
- Tests patient understanding of critical instructions
- If score is low, AI regenerates with even simpler language
- Tracks comprehension scores over time

---

## 👥 Beneficiaries

### Primary Beneficiaries

| Stakeholder | How They Benefit |
|-------------|-----------------|
| **Patients** | Understand their medications, tests, and recovery plan in plain language (English + Bengali) |
| **Family Caregivers** | Get clear medication schedules, warning signs, and emergency action plans |
| **Elderly Patients** | Ultra-simplified language with visual cues and step-by-step instructions |
| **Doctors** | Save time on patient education; digital prescription history; multi-report management |
| **Hospital Admins** | Quality control via approval queue; audit trail; compliance monitoring |
| **Pharmacists** | Access digitized, structured prescription data instead of deciphering handwriting |

### Secondary Beneficiaries

| Stakeholder | How They Benefit |
|-------------|-----------------|
| **Healthcare System** | Reduced readmission rates through better patient compliance |
| **Insurance Companies** | Structured data for claims processing and verification |
| **Public Health** | Aggregated anonymized data for disease surveillance |
| **Medical Researchers** | Structured prescription datasets for pharmaceutical research |

---

## 🔧 Technical Architecture

### Backend (Python + FastAPI)

```
backend/
├── ai/
│   └── prompts.py                    # All Gemini prompt templates (v2 with normalization)
├── core/
│   └── exceptions.py                 # Custom exception classes
├── db/
│   ├── local.py                      # SQLite schema + seed data
│   ├── mock_supabase.py              # SQLite-backed Supabase mock client
│   ├── prescription_db.py            # Prescription CRUD operations
│   └── supabase_service.py           # Supabase client initialization
├── models/
│   ├── auth.py                       # Auth request/response models
│   ├── common.py                     # Shared enums and base models
│   ├── discharge.py                  # Discharge summary models
│   ├── prescription.py               # Prescription models (extended schema)
│   └── whatsapp.py                   # WhatsApp models
├── routes/
│   ├── auth_routes.py                # Login/signup/OTP routes
│   ├── prescriptions.py              # Prescription pipeline routes
│   └── core_routes.py                # Health/analytics routes
├── services/
│   ├── gemini_service.py             # Gemini API client (OCR + text generation)
│   ├── image_preprocessor.py         # [NEW] OpenCV image preprocessing
│   ├── patient_insights_service.py   # [NEW] Patient-friendly content generation
│   ├── prescription_rag_service.py   # RAG extraction pipeline
│   ├── rate_limiter_service.py       # [NEW] Gemini API rate limit guard
│   ├── rate_alert_service.py         # Usage tracking and alerting
│   └── s3_service.py                 # File storage service
└── main.py                           # FastAPI application entry point
```

### Frontend (React + Vite)

```
src/
├── components/
│   ├── AppShell.jsx                  # Navigation sidebar with role filtering
│   ├── MedicalHeart3D.jsx            # 3D heart visualization
│   ├── DNA3DHelix.jsx                # 3D DNA helix
│   ├── VitalSignsChart.jsx           # Vital signs line chart
│   └── ...                           # Other visualization components
├── context/
│   └── AuthContext.jsx               # Role-based authentication state
├── pages/
│   ├── DoctorPanelPage.jsx           # Multi-report upload + extraction view
│   ├── AdminPanelPage.jsx            # Review queue + dynamic stats + history
│   ├── FamilyDashboardPage.jsx       # Patient panel with insights
│   ├── ClarityHubPage.jsx            # AI chat assistant
│   ├── DetailedClarityHubPage.jsx    # Voice assistant + treatment plan
│   ├── SettingsPage.jsx              # User preferences
│   └── LoginPage.jsx / SignupPage.jsx
├── services/
│   └── api.js                        # Backend API client
└── utils/
    ├── auth.js                       # Auth utilities + role routing
    └── config.js                     # API endpoints + constants
```

---

## 🔄 Data Flow Pipeline

```
┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Doctor    │    │ Image     │    │ Gemini   │    │ RAG      │    │ Database │
│ Uploads   │───▶│ Preproc   │───▶│ OCR      │───▶│ Extract  │───▶│ Store    │
│ Rx Image  │    │ (OpenCV)  │    │ (t=0.0)  │    │ (t=0.0)  │    │ (SQLite) │
└──────────┘    └───────────┘    └──────────┘    └──────────┘    └──────────┘
                                                                       │
                                                                       ▼
┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Patient  │    │ Clarity   │    │ Insights │    │ Admin    │    │ Admin    │
│ Sees     │◀───│ Center    │◀───│ Generate │◀───│ Approves │◀───│ Reviews  │
│ Guide    │    │ AI Chat   │    │ (Gemini) │    │ Record   │    │ Queue    │
└──────────┘    └───────────┘    └──────────┘    └──────────┘    └──────────┘
```

### Step-by-Step:

1. **Doctor Upload** → Selects patient, report type, uploads file
2. **Image Preprocessing** → Orientation fix, contrast enhancement, denoising, binarization
3. **OCR Extraction** → Gemini Vision extracts all visible text (temperature=0.0)
4. **RAG Extraction** → Knowledge-augmented structured extraction into unified schema
5. **Post-Processing** → Normalization, validation, confidence scoring
6. **Database Storage** → Persisted with `pending_admin_review` status
7. **Admin Review** → Admin sees structured data, approves or rejects
8. **Patient Insights Generation** → On approval, Gemini generates patient-friendly content
9. **Patient Delivery** → Patient sees medication guide, test explanations, health summary
10. **Clarity Center** → AI chatbot provides ongoing guidance based on prescription data

---

## 🔬 Extraction Consistency Engine

### The Problem
Same prescription image → different outputs across runs. This is unacceptable for medical data.

### The Solution: 4-Layer Consistency Stack

#### Layer 1: Image Preprocessing (OpenCV)
```
Raw Image → EXIF Orientation Fix → CLAHE Contrast → Gaussian Denoise → Adaptive Binarize → Clean Image
```

#### Layer 2: Deterministic AI (Temperature = 0.0)
- OCR: `temperature=0.0` — same image always extracts same text
- RAG: `temperature=0.0` — same text always produces same structure
- Seed parameter for additional reproducibility

#### Layer 3: RAG with Knowledge Context
- 6 domain-specific knowledge snippets guide extraction
- Keyword overlap scoring selects most relevant context
- Top-4 snippets injected into prompt for field recognition

#### Layer 4: Post-Processing Normalization
```
Frequency:  "OD" → "Once daily (morning)"
            "BD" → "Twice daily (morning & evening)"
            "TDS" → "Three times daily"
            "QID" → "Four times daily"
            "SOS" → "As needed (when required)"
            "HS" → "At bedtime"

Form:       "Tab" → "Tablet"
            "Cap" → "Capsule"
            "Syp" → "Syrup"
            "Inj" → "Injection"

Instructions: "AC" → "Before food"
              "PC" → "After food"
              "HS" → "At bedtime"

Strength:   "500mg" → "500 mg"
            "5ml" → "5 ml"

Names:      Title Case normalization
            Deduplication check
```

---

## 📊 Unified Data Schema

### Prescription Record (Extended)

```json
{
  "prescription_id": "uuid-v4",
  "status": "pending_admin_review | approved | rejected",
  "report_type": "prescription | ecg | echo | ct_scan | mri | blood_test | other",
  "linked_prescription_id": "parent-uuid or null",
  
  "doctor_id": "mock-doctor-001",
  "doctor_name": "Dr. Sukriti Mukherjee",
  
  "patient_id": "mock-patient-001",
  "patient_name": "Mr. Suvam Paul",
  "patient_age": "20 yrs",
  "patient_gender": "Male",
  
  "prescription_date": "04/12/25",
  "diagnosis": "F42.2 - OCD with anxiety features",
  
  "medications": [
    {
      "name": "Venlafaxine XL",
      "strength": "75 mg",
      "form": "Tablet",
      "frequency": "Once daily (morning)",
      "duration": null,
      "instructions": null,
      "purpose": "For anxiety and OCD symptoms",
      "schedule": {
        "morning": "1 tablet",
        "afternoon": null,
        "evening": null,
        "night": null
      },
      "warnings": "Do not stop suddenly — taper under doctor guidance"
    }
  ],
  
  "tests": [
    {
      "name": "ECG",
      "reason": "Baseline heart rhythm check before medication",
      "urgency": "Routine"
    }
  ],
  
  "notes": "Review after 1 month",
  "extraction_confidence": 0.85,
  "raw_ocr_text": "Dr Sukriti Mukherjee...",
  
  "patient_insights": {
    "medication_guide": [
      {
        "name": "Venlafaxine XL (75 mg)",
        "what": "A tablet that helps reduce anxiety and repetitive thoughts",
        "why": "Your doctor prescribed this because it helps balance brain chemicals that control mood and worry",
        "when": "Take 1 tablet every morning with breakfast",
        "caution": "Never stop this medicine suddenly — it can cause withdrawal symptoms. Always talk to your doctor first."
      }
    ],
    "test_guide": [
      {
        "name": "ECG (Electrocardiogram)",
        "why": "To check your heart rhythm before starting the new medication",
        "what_to_expect": "Small sticky patches on your chest, completely painless, takes about 5 minutes"
      }
    ],
    "health_summary": "You are being treated for anxiety and repetitive worry patterns. Your medications have been adjusted to better manage these symptoms with fewer side effects.",
    "dos_and_donts": {
      "do": [
        "Take your medicine at the same time every day",
        "Practice deep breathing exercises regularly",
        "Maintain a healthy sleep schedule",
        "Come for your review appointment in 1 month"
      ],
      "dont": [
        "Don't skip doses or stop medicine on your own",
        "Don't consume alcohol while on this medication",
        "Don't ignore sudden mood changes — report to your doctor"
      ]
    }
  },
  
  "s3_key": "rx_mock-doctor-001/prescription.jpeg",
  "created_at": "2025-12-04T10:30:00Z",
  "admin_id": "mock-admin-001",
  "reviewed_at": "2025-12-04T11:00:00Z",
  "rejection_reason": null
}
```

---

## 🎭 Role-Based Output System

### Doctor View
- Full clinical data with original terminology
- Side-by-side: Original prescription image | Extracted structured data
- Medications table with strength, frequency, duration, instructions
- Tests with urgency classification
- Upload history and patient record linkage
- Confidence score per extraction

### Admin View
- Same structured data as doctor (zero transformation loss)
- Approval/rejection workflow with reason tracking
- Stats dashboard: Total / Pending / Approved / Rejected counts
- Complete prescription history with search and filtering
- Audit trail (who approved, when, rejection reasons)

### Patient View
- **Medication Guide**: "Take [drug] every [morning] because [reason]. Be careful: [warning]"
- **Test Guide**: "[ECG] checks [what]. It's [experience description]."
- **Health Summary**: Plain-language condition explanation
- **Do's and Don'ts**: Bulleted actionable lists
- **Clarity Center**: AI chatbot for follow-up questions
- **Voice Assistant**: Bilingual audio guidance

---

## 📎 Multi-Report Upload System

### Supported Report Types

| Report Type | Extraction Focus | Icon |
|-------------|-----------------|------|
| Prescription | Medications, dosage, frequency, tests, diagnosis | 💊 |
| ECG | Heart rhythm analysis, findings, recommendations | ❤️ |
| Echo | Cardiac structure, ejection fraction, valve status | 🫀 |
| CT Scan | Imaging findings, measurements, impressions | 🔍 |
| MRI | Soft tissue findings, contrast observations | 🧲 |
| Blood Test | Lab values, reference ranges, abnormal flags | 🩸 |
| Other | General text extraction | 📄 |

### Linking System
- Each report is linked to a **parent prescription** via `linked_prescription_id`
- Patient timeline shows all linked documents in chronological order
- Admin can verify each report independently
- Patient sees all their reports in a unified view

---

## 🛡️ API Rate Limit Protection

### Problem
Google Gemini API has rate limits. Exceeding them causes service outage.

### Solution: Proactive Rate Guard

```python
# Configuration
RATE_LIMITS = {
    "requests_per_minute": 15,     # Gemini free tier: ~15 RPM
    "requests_per_day": 1500,      # Gemini free tier: ~1500 RPD
    "warning_threshold": 0.80,      # Alert at 80% usage
    "block_threshold": 0.95,        # Block at 95% usage
}
```

### Behavior
1. **Every Gemini call** → rate limiter checks current usage
2. **At 80% capacity** → `⚠️ WARNING` printed to backend console with usage stats
3. **At 95% capacity** → requests are **blocked** before they hit the API
4. **Console output**: Clear message telling developer to rotate API key
5. **Daily reset** at midnight UTC

### Console Alert Format
```
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  GEMINI API RATE LIMIT WARNING                          ║
║  Current usage: 12/15 requests per minute (80%)              ║
║  Daily usage: 1200/1500 requests today (80%)                 ║
║  ACTION: Prepare to rotate API key if usage continues        ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 🔐 Security & Privacy

- **Role-Based Access Control (RBAC)**: Strict role enforcement — patients cannot access doctor/admin panels
- **No Mock Data in Production**: All patient data is dynamically generated from real extractions
- **Password Hashing**: Secure credential storage
- **Session Management**: Token-based authentication
- **Data Minimization**: Only necessary fields are exposed per role
- **Audit Trail**: Every admin action (approve/reject) is timestamped and attributed
- **HIPAA-Aware Design**: Patient data is never logged in full; only IDs appear in logs

---

## 🗺️ Roadmap

### ✅ Phase 1: Foundation (Completed)
- [x] Role-based authentication (Patient/Doctor/Admin)
- [x] Login + Signup with dark-teal glassmorphism UI
- [x] FastAPI backend with modular architecture
- [x] Local SQLite database with Supabase compatibility
- [x] Basic prescription OCR via Gemini Vision
- [x] RAG extraction pipeline with knowledge snippets
- [x] Admin approval/rejection workflow
- [x] Patient prescription visibility
- [x] Clarity Center with AI chatbot
- [x] 3D medical visualizations (Heart, DNA, Cube)
- [x] WhatsApp message generation

### 🔄 Phase 2: Extraction Consistency (Current)
- [ ] OpenCV image preprocessing pipeline
- [ ] Temperature 0.0 deterministic extraction
- [ ] Post-processing normalization layer
- [ ] Frequency/form/strength standardization
- [ ] Field validation and confidence scoring
- [ ] Gemini API rate limit protection

### 🔄 Phase 3: Extended Schema
- [ ] PrescriptionTest model (tests array)
- [ ] DosageSchedule model (morning/afternoon/evening/night)
- [ ] PatientInsights model (medication guide, test guide, health summary, dos/donts)
- [ ] report_type field
- [ ] linked_prescription_id for multi-report linking
- [ ] raw_ocr_text preservation
- [ ] Database migration for new columns

### 🔄 Phase 4: Role-Based Output
- [ ] Patient insights generation service (Gemini)
- [ ] Doctor-view API endpoint
- [ ] Enhanced patient-view with insights
- [ ] Admin history endpoint (all prescriptions)
- [ ] Insights generated on admin approval

### 🔄 Phase 5: Multi-Report Upload
- [ ] Report type selector in Doctor Panel
- [ ] Patient selector from API (no fake patients)
- [ ] Side-by-side original + extracted view
- [ ] Upload history per doctor
- [ ] Report linking to parent prescriptions

### 🔄 Phase 6: Panel Cleanup
- [ ] Doctor Panel: Remove all hardcoded fake data
- [ ] Admin Panel: Remove mock metrics, add dynamic stats + history
- [ ] Patient Panel: Dynamic medication guide from insights
- [ ] Navigation: Restrict Clarity Center to patient role

### 📋 Phase 7: Future Enhancements (Planned)
- [ ] Gamification layer (comprehension streaks, health badges)
- [ ] Telemedicine integration (video call from within app)
- [ ] Multi-language support expansion (Hindi, Tamil, etc.)
- [ ] Real-time vital signs integration (IoT devices)
- [ ] Mobile responsive progressive web app (PWA)
- [ ] Prescription refill reminders
- [ ] Drug interaction checker
- [ ] Cloud deployment (GCP Cloud Run)

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | Single-page application |
| **Styling** | Tailwind CSS + Glassmorphism | Premium dark-teal UI |
| **3D** | Three.js + React Three Fiber | Medical visualizations |
| **Charts** | Chart.js + react-chartjs-2 | Analytics dashboards |
| **Backend** | Python + FastAPI | REST API server |
| **AI/ML** | Google Gemini 2.5 Flash | OCR + extraction + insights |
| **Image Processing** | OpenCV + Pillow | Prescription preprocessing |
| **Database** | SQLite (local) / Supabase (cloud) | Data persistence |
| **File Storage** | AWS S3 compatible | Prescription image storage |
| **Auth** | Custom JWT-compatible | Role-based access control |
| **Messaging** | Twilio WhatsApp API | Patient notification delivery |

---

## 📞 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Role-based login |
| POST | `/api/auth/signup` | User registration |
| POST | `/api/auth/send-otp` | Send OTP via WhatsApp/SMS |
| POST | `/api/auth/verify-otp` | Verify OTP code |

### Prescription Pipeline
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/prescriptions/extract` | Upload + extract prescription |
| GET | `/api/prescriptions/pending` | List pending for admin review |
| POST | `/api/prescriptions/{id}/approve` | Admin approve |
| POST | `/api/prescriptions/{id}/reject` | Admin reject |
| GET | `/api/prescriptions/{id}/patient-view` | Patient-friendly view |
| GET | `/api/prescriptions/{id}/doctor-view` | Full clinical view |
| GET | `/api/prescriptions/by-doctor/{id}` | Doctor's upload history |
| GET | `/api/prescriptions/for-patient/{id}` | Patient's approved records |
| GET | `/api/prescriptions/all` | Admin: all records with history |
| GET | `/api/patients` | List registered patients |

### Utility
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | API health check |
| POST | `/api/process` | Discharge summary simplification |
| POST | `/api/send-whatsapp` | WhatsApp delivery |
| POST | `/api/quiz/submit` | Comprehension quiz |

---

## 🏆 Competitive Advantages

1. **End-to-End Pipeline**: No other system combines OCR → structured extraction → admin review → patient-friendly explanation in a single platform
2. **Deterministic AI**: Same input always produces same output — critical for medical applications
3. **Bilingual by Default**: English + Bengali support built into every feature
4. **Role-Based by Design**: Not an afterthought — the entire architecture is role-aware
5. **Multi-Document Linking**: Prescription + ECG + MRI + Blood Test all linked to one patient
6. **AI Insights on Approval**: Patient-friendly content generated only after admin verification — accuracy guaranteed
7. **Rate Limit Protection**: Production-ready API management with proactive alerts
8. **Premium UI/UX**: Dark-teal glassmorphism design that feels like a premium healthcare product, not a hackathon demo

---

*SwasthaLink — Because understanding your health should never be lost in translation.*
