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
            password_hash TEXT
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
            linked_prescription_id TEXT,
            payload_version INTEGER DEFAULT 1,
            raw_extraction_snapshot TEXT
        );

        CREATE TABLE IF NOT EXISTS patient_context_chunks (
            chunk_id TEXT PRIMARY KEY,
            prescription_id TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            chunk_type TEXT NOT NULL,
            data TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id)
        );

        CREATE TABLE IF NOT EXISTS audit_events (
            id TEXT PRIMARY KEY,
            prescription_id TEXT NOT NULL,
            action TEXT NOT NULL,
            actor_role TEXT NOT NULL,
            actor_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            details TEXT,
            FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id)
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
    ''')
    conn.commit()
    conn.close()
    # Run migration for existing databases
    _migrate_prescriptions_table()
    _migrate_table_names()


def _migrate_prescriptions_table():
    """Add new columns to existing prescriptions table (safe for fresh DB too)."""
    conn = get_connection()
    c = conn.cursor()
    new_columns = [
        ("tests", "TEXT DEFAULT '[]'"),
        ("report_type", "TEXT DEFAULT 'prescription'"),
        ("raw_ocr_text", "TEXT"),
        ("patient_insights", "TEXT"),
        ("linked_prescription_id", "TEXT"),
        ("payload_version", "INTEGER DEFAULT 1"),
        ("raw_extraction_snapshot", "TEXT"),
    ]
    for col_name, col_type in new_columns:
        try:
            c.execute(f"ALTER TABLE prescriptions ADD COLUMN {col_name} {col_type}")
        except Exception:
            pass  # Column already exists
    conn.commit()
    conn.close()


def _migrate_table_names():
    """Rename legacy tables to the current names when needed."""
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("BEGIN IMMEDIATE")

        c.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='audit_events'"
        )
        has_audit_events = c.fetchone() is not None
        c.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='audit_log'"
        )
        has_audit_log = c.fetchone() is not None
        if has_audit_log and not has_audit_events:
            c.execute("ALTER TABLE audit_log RENAME TO audit_events")

        c.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='patient_context_chunks'"
        )
        has_patient_context_chunks = c.fetchone() is not None
        c.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='patient_data_chunks'"
        )
        has_patient_data_chunks = c.fetchone() is not None
        if has_patient_data_chunks and not has_patient_context_chunks:
            c.execute("ALTER TABLE patient_data_chunks RENAME TO patient_context_chunks")
    except Exception:
        conn.rollback()
    else:
        conn.commit()
    conn.close()


def seed_mock_users():
    """Seed three mock credential users for local development testing."""
    import uuid

    mock_users = [
        {
            "id": "mock-patient-001",
            "user_id": "mock-patient-001",
            "email": "patient@swasthalink.demo",
            "full_name": "Demo Patient",
            "role": "patient",
            "phone": "+919876543210",
            "phone_verified": 1,
            "password_hash": "Patient@123",
        },
        {
            "id": "mock-doctor-001",
            "user_id": "mock-doctor-001",
            "email": "doctor@swasthalink.demo",
            "full_name": "Dr. Demo",
            "role": "doctor",
            "phone": "+919876543211",
            "phone_verified": 1,
            "password_hash": "Doctor@123",
        },
        {
            "id": "mock-admin-001",
            "user_id": "mock-admin-001",
            "email": "admin@swasthalink.demo",
            "full_name": "Admin Demo",
            "role": "admin",
            "phone": "+919876543212",
            "phone_verified": 1,
            "password_hash": "Admin@123",
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
seed_mock_users()
