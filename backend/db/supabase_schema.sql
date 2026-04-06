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
    password_hash TEXT,
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

-- ---------------------------------------------------------
-- Helper: Auto-create profile on signup (Trigger)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  resolved_role TEXT;
  resolved_name TEXT;
BEGIN
  resolved_role := lower(coalesce(new.raw_user_meta_data->>'role', 'patient'));
  IF resolved_role NOT IN ('patient', 'doctor', 'admin') THEN
    resolved_role := 'patient';
  END IF;

  resolved_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, ''), '@', 1)
  );

  INSERT INTO public.profiles (
    id,
    user_id,
    email,
    full_name,
    name,
    role,
    phone,
    phone_verified,
    updated_at
  )
  VALUES (
    new.id,
    new.id::text,
    lower(new.email),
    resolved_name,
    resolved_name,
    resolved_role,
    new.raw_user_meta_data->>'phone',
    false,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
