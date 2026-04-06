-- ---------------------------------------------------------
-- SwasthaLink Database Schema
-- Uses Supabase as a plain PostgreSQL database.
-- No Supabase Auth, no RLS, no triggers on auth.users.
-- Authentication is handled entirely by the backend (bcrypt + JWT).
-- ---------------------------------------------------------

-- 1. Profiles Table (standalone — no link to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    name TEXT,
    role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
    phone TEXT,
    phone_verified BOOLEAN DEFAULT FALSE,
    password_hash TEXT NOT NULL DEFAULT '',
    pid TEXT, -- System Generated Patient ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 4. Session History (Persistent Clinical Context)
CREATE TABLE IF NOT EXISTS public.session_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    role TEXT,
    language TEXT,
    discharge_text TEXT,
    simplified_english TEXT,
    simplified_bengali TEXT,
    medications JSONB DEFAULT '[]',
    follow_up JSONB DEFAULT '{}',
    warning_signs JSONB DEFAULT '[]',
    comprehension_questions JSONB DEFAULT '[]',
    whatsapp_message TEXT,
    re_explain BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_session_history_session_created
    ON public.session_history (session_id, created_at DESC);

-- 5. Session Events (Quiz / WhatsApp Timeline)
CREATE TABLE IF NOT EXISTS public.session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_session_events_session_created
    ON public.session_events (session_id, created_at ASC);

-- 6. Discharge/Clinical Results
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

CREATE INDEX IF NOT EXISTS idx_discharge_results_patient_created
    ON public.discharge_results (patient_id, created_at DESC);

-- 7. Share Tokens (Temporary Access)
CREATE TABLE IF NOT EXISTS public.share_tokens (
    token TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_tokens_session
    ON public.share_tokens (session_id);

CREATE INDEX IF NOT EXISTS idx_share_tokens_expires_at
    ON public.share_tokens (expires_at);

-- 8. Follow-up Messages (Twilio Queue)
CREATE TABLE IF NOT EXISTS public.followup_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    session_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    patient_name TEXT,
    phone_number TEXT NOT NULL,
    day_offset INTEGER NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    message_text TEXT NOT NULL,
    medications JSONB DEFAULT '[]',
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    twilio_sid TEXT,
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_followup_messages_status_scheduled
    ON public.followup_messages (status, scheduled_for);

-- End of schema.
-- Authentication is handled by the backend via profiles.password_hash (bcrypt).
-- No Supabase Auth triggers or RLS policies are used.
