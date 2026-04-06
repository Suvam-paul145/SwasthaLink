"""
Local SQLite database for development fallback.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "swasthalink.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    c = conn.cursor()
    c.executescript('''
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            email TEXT UNIQUE,
            full_name TEXT,
            role TEXT,
            phone TEXT,
            phone_verified BOOLEAN DEFAULT 0,
            password_hash TEXT,
            pid TEXT
        );

        CREATE TABLE IF NOT EXISTS prescriptions (
            prescription_id TEXT PRIMARY KEY,
            status TEXT,
            doctor_id TEXT,
            patient_id TEXT,
            patient_name TEXT,
            patient_age TEXT,
            patient_gender TEXT,
            doctor_name TEXT,
            prescription_date TEXT,
            diagnosis TEXT,
            notes TEXT,
            medications TEXT,
            extraction_confidence REAL,
            s3_key TEXT,
            created_at TEXT,
            admin_id TEXT,
            reviewed_at TEXT,
            rejection_reason TEXT,
            tests TEXT DEFAULT '[]',
            report_type TEXT DEFAULT 'prescription',
            raw_ocr_text TEXT,
            patient_insights TEXT,
            linked_prescription_id TEXT
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            created_at TEXT,
            role TEXT,
            language TEXT,
            quiz_score INTEGER,
            whatsapp_sent BOOLEAN DEFAULT 0,
            re_explained BOOLEAN DEFAULT 0,
            log_format TEXT DEFAULT 'text'
        );

        CREATE TABLE IF NOT EXISTS session_history (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            created_at TEXT,
            role TEXT,
            language TEXT,
            discharge_text TEXT,
            simplified_english TEXT,
            simplified_bengali TEXT,
            medications TEXT,
            follow_up TEXT,
            warning_signs TEXT,
            comprehension_questions TEXT,
            whatsapp_message TEXT,
            re_explain BOOLEAN DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS session_events (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            created_at TEXT,
            event_type TEXT,
            event_data TEXT
        );

        CREATE TABLE IF NOT EXISTS discharge_results (
            id TEXT PRIMARY KEY,
            created_at TEXT,
            patient_id TEXT NOT NULL,
            doctor_id TEXT,
            simplified_english TEXT NOT NULL,
            simplified_bengali TEXT NOT NULL,
            medications TEXT DEFAULT '[]',
            follow_up TEXT DEFAULT '{}',
            warning_signs TEXT DEFAULT '[]',
            quiz_questions TEXT DEFAULT '[]',
            risk_score INTEGER,
            risk_level TEXT
        );

        CREATE TABLE IF NOT EXISTS share_tokens (
            token TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS followup_messages (
            id TEXT PRIMARY KEY,
            created_at TEXT,
            session_id TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            patient_name TEXT,
            phone_number TEXT NOT NULL,
            day_offset INTEGER NOT NULL,
            scheduled_for TEXT NOT NULL,
            message_text TEXT NOT NULL,
            medications TEXT DEFAULT '[]',
            status TEXT DEFAULT 'pending',
            sent_at TEXT,
            twilio_sid TEXT,
            error TEXT
        );
    ''')
    conn.commit()
    conn.close()
    _run_migrations()


def _run_migrations():
    """Add missing columns/tables for existing local databases."""
    conn = get_connection()
    c = conn.cursor()

    c.executescript('''
        CREATE TABLE IF NOT EXISTS share_tokens (
            token TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS followup_messages (
            id TEXT PRIMARY KEY,
            created_at TEXT,
            session_id TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            patient_name TEXT,
            phone_number TEXT NOT NULL,
            day_offset INTEGER NOT NULL,
            scheduled_for TEXT NOT NULL,
            message_text TEXT NOT NULL,
            medications TEXT DEFAULT '[]',
            status TEXT DEFAULT 'pending',
            sent_at TEXT,
            twilio_sid TEXT,
            error TEXT
        );
    ''')

    new_columns = [
        ("prescriptions", "tests", "TEXT DEFAULT '[]'"),
        ("prescriptions", "report_type", "TEXT DEFAULT 'prescription'"),
        ("prescriptions", "raw_ocr_text", "TEXT"),
        ("prescriptions", "patient_insights", "TEXT"),
        ("prescriptions", "linked_prescription_id", "TEXT"),
        ("profiles", "pid", "TEXT"),
        ("discharge_results", "risk_score", "INTEGER"),
        ("discharge_results", "risk_level", "TEXT"),
    ]
    for table_name, col_name, col_type in new_columns:
        try:
            c.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")
        except Exception:
            pass  # Column already exists
    conn.commit()
    conn.close()


def seed_mock_users():
    """Seed three mock credential users for local development testing."""
    # Hash passwords with bcrypt if available
    try:
        import bcrypt
        def _hash(pw):
            return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    except ImportError:
        def _hash(pw):
            return pw

    mock_users = [
        {
            "id": "mock-patient-001",
            "user_id": "mock-patient-001",
            "email": "patient@swasthalink.demo",
            "full_name": "Demo Patient",
            "role": "patient",
            "phone": "+919876543210",
            "phone_verified": 1,
            "password_hash": _hash("Patient@123"),
        },
        {
            "id": "mock-doctor-001",
            "user_id": "mock-doctor-001",
            "email": "doctor@swasthalink.demo",
            "full_name": "Dr. Demo",
            "role": "doctor",
            "phone": "+919876543211",
            "phone_verified": 1,
            "password_hash": _hash("Doctor@123"),
        },
        {
            "id": "mock-admin-001",
            "user_id": "mock-admin-001",
            "email": "admin@swasthalink.demo",
            "full_name": "Admin Demo",
            "role": "admin",
            "phone": "+919876543212",
            "phone_verified": 1,
            "password_hash": _hash("Admin@123"),
        },
    ]

    conn = get_connection()
    c = conn.cursor()
    for user in mock_users:
        try:
            c.execute(
                "INSERT OR REPLACE INTO profiles (id, user_id, email, full_name, role, phone, phone_verified, password_hash) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (user["id"], user["user_id"], user["email"], user["full_name"],
                 user["role"], user["phone"], user["phone_verified"], user["password_hash"]),
            )
        except Exception:
            pass
    conn.commit()
    conn.close()


init_db()
