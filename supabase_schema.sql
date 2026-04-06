-- ---------------------------------------------------------
-- SwasthaLink Database Schema for Real Supabase Integration
-- ---------------------------------------------------------

-- 1. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id TEXT UNIQUE,
    email TEXT UNIQUE,
    full_name TEXT,
    name TEXT,
    role TEXT CHECK (role IN ('patient', 'doctor', 'admin')),
    phone TEXT,
    phone_verified BOOLEAN DEFAULT FALSE,
    pid TEXT, -- System Generated Patient ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Prescriptions Table
CREATE TABLE IF NOT EXISTS public.prescriptions (
    prescription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT DEFAULT 'pending_admin_review',
    doctor_id TEXT,
    patient_id TEXT,
    patient_name TEXT,
    patient_age TEXT,
    patient_gender TEXT,
    doctor_name TEXT,
    prescription_date TEXT,
    diagnosis TEXT,
    notes TEXT,
    medications JSONB DEFAULT '[]',
    tests JSONB DEFAULT '[]',
    extraction_confidence REAL,
    s3_key TEXT,
    raw_ocr_text TEXT,
    patient_insights TEXT,
    linked_prescription_id TEXT,
    admin_id TEXT,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    report_type TEXT DEFAULT 'prescription',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- 3. Sessions (Logging Metadata)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    role TEXT,
    language TEXT,
    quiz_score INTEGER,
    whatsapp_sent BOOLEAN DEFAULT FALSE,
    re_explained BOOLEAN DEFAULT FALSE,
    log_format TEXT DEFAULT 'text'
);

-- 4. Discharge/Clinical Results
CREATE TABLE IF NOT EXISTS public.discharge_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    patient_id TEXT NOT NULL,
    doctor_id TEXT,
    simplified_english TEXT NOT NULL,
    simplified_bengali TEXT NOT NULL,
    medications JSONB DEFAULT '[]',
    follow_up JSONB DEFAULT '{}',
    warning_signs JSONB DEFAULT '[]',
    quiz_questions JSONB DEFAULT '[]',
    risk_score INTEGER,
    risk_level TEXT
);

-- 5. Share Tokens (Temporary Access)
CREATE TABLE IF NOT EXISTS public.share_tokens (
    token TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Follow-up Messages (Twilio Queue)
CREATE TABLE IF NOT EXISTS public.followup_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMT_TZ DEFAULT NOW(),
    session_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    patient_name TEXT,
    phone_number TEXT NOT NULL,
    day_offset INTEGER NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    message_text TEXT NOT NULL,
    medications JSONB DEFAULT '[]',
    status TEXT DEFAULT 'pending'
);
