"""
Mock Supabase client backed by local SQLite.
Used for local development without a real Supabase instance.

Now with:
- bcrypt password hashing (secure signup)
- Real JWT tokens via auth/jwt_utils (24-hour expiry)
"""

import sqlite3
import uuid
import json
import logging
import db.local as db_local

logger = logging.getLogger(__name__)

# Try to import bcrypt; fall back to plaintext if not installed
try:
    import bcrypt
    BCRYPT_AVAILABLE = True
except ImportError:
    BCRYPT_AVAILABLE = False
    logger.warning("bcrypt not installed — passwords stored in plaintext (install bcrypt for security)")

# Try to import JWT utils; fall back to mock token if not available
from auth.jwt_utils import create_access_token
JWT_AVAILABLE = True


def _hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    if BCRYPT_AVAILABLE:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    return password


def _verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a bcrypt hash. Falls back to plaintext comparison."""
    if BCRYPT_AVAILABLE:
        try:
            return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
        except (ValueError, TypeError):
            # Hash might be plaintext from before bcrypt was installed
            return password == hashed
    return password == hashed


class MockData:
    def __init__(self, data):
        self.data = data


class MockUser:
    def __init__(self, user_id, email="", role="", name=""):
        self.id = user_id
        self.email = email
        self.user_metadata = {"full_name": name, "role": role}
        self.app_metadata = {}


class MockSession:
    def __init__(self, access_token="mock-jwt-token"):
        self.access_token = access_token


class MockAuthResponse:
    def __init__(self, user, session=None):
        self.user = user
        self.session = session


class MockAuth:
    def __init__(self, db_conn):
        self.db = db_conn

    def sign_up(self, payload):
        email = payload.get("email")
        password = payload.get("password")
        data = payload.get("options", {}).get("data", {})
        user_id = str(uuid.uuid4())
        name = data.get("full_name", "")
        role = data.get("role", "patient")

        # Hash the password
        hashed_password = _hash_password(password)

        c = self.db.cursor()
        try:
            c.execute(
                "INSERT INTO profiles (id, user_id, email, password_hash, full_name, role, phone, phone_verified) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (user_id, user_id, email, hashed_password, name,
                 role, data.get("phone", ""), 0),
            )
            self.db.commit()
        except sqlite3.IntegrityError:
            self.db.rollback()
            raise Exception("User already registered")

        user = MockUser(user_id, email=email, role=role, name=name)
        return MockAuthResponse(user)

    def sign_in_with_password(self, payload):
        email = payload.get("email")
        password = payload.get("password")
        c = self.db.cursor()
        c.execute("SELECT * FROM profiles WHERE email=?", (email,))
        row = c.fetchone()
        if not row:
            raise Exception("Invalid login credentials")

        row_dict = dict(row)
        stored_hash = row_dict.get("password_hash", "")

        # Verify password
        if not _verify_password(password, stored_hash):
            raise Exception("Invalid login credentials")

        user_id = row_dict["user_id"]
        role = row_dict.get("role", "patient")
        name = row_dict.get("full_name", "")

        user = MockUser(user_id, email=email, role=role, name=name)

        # Generate a real JWT token
        if JWT_AVAILABLE:
            token = create_access_token(
                user_id=user_id,
                email=email,
                role=role,
                name=name,
            )
        else:
            token = "mock-jwt-token"

        session = MockSession(access_token=token)
        return MockAuthResponse(user, session=session)


class MockQuery:
    def __init__(self, db_conn, table):
        self.db = db_conn
        self.table = table
        self.action = None
        self.payload = None
        self.filters = []
        self._limit = None
        self._order = None
        self._single = False

    def select(self, cols="*", **kwargs):
        self.action = "select"
        return self

    def insert(self, payload):
        self.action = "insert"
        if isinstance(payload, list):
            self.payload = payload
        else:
            self.payload = [payload]
        return self

    def upsert(self, payload):
        self.action = "upsert"
        if isinstance(payload, list):
            self.payload = payload
        else:
            self.payload = [payload]
        return self

    def update(self, payload):
        self.action = "update"
        self.payload = payload
        return self

    def eq(self, col, val):
        self.filters.append((col, "=", val))
        return self

    def in_(self, col, vals):
        self.filters.append((col, "IN", vals))
        return self

    def limit(self, val):
        self._limit = val
        return self

    def order(self, col, desc=False):
        self._order = (col, desc)
        return self

    def single(self):
        self._single = True
        return self

    def delete(self):
        self.action = "delete"
        return self

    @staticmethod
    def _maybe_json_decode(row_dict):
        for key in (
            "medications",
            "event_data",
            "tests",
            "patient_insights",
            "raw_extraction_snapshot",
            "payload",
            "metadata",
            "details",
            "data",
        ):
            if key in row_dict and isinstance(row_dict[key], str):
                try:
                    row_dict[key] = json.loads(row_dict[key])
                except Exception:
                    if key in ("tests",):
                        row_dict[key] = []
                    elif key in ("patient_insights", "raw_extraction_snapshot"):
                        row_dict[key] = None
        return row_dict

    def execute(self):
        c = self.db.cursor()

        if self.action in ("insert", "upsert"):
            for item in self.payload:
                cols = ", ".join(item.keys())
                placeholders = ", ".join(["?"] * len(item))
                vals = []
                for v in item.values():
                    if isinstance(v, (dict, list)):
                        vals.append(json.dumps(v))
                    else:
                        vals.append(v)
                c.execute(
                    f"INSERT OR REPLACE INTO {self.table} ({cols}) VALUES ({placeholders})",
                    tuple(vals),
                )
            self.db.commit()
            return MockData(self.payload)

        elif self.action == "update":
            set_clause = ", ".join([f"{k} = ?" for k in self.payload.keys()])
            vals = []
            for v in self.payload.values():
                if isinstance(v, (dict, list)):
                    vals.append(json.dumps(v))
                else:
                    vals.append(v)

            where = ""
            if self.filters:
                where = " WHERE " + " AND ".join([f"{f[0]} {f[1]} ?" for f in self.filters])
                vals.extend([f[2] for f in self.filters])

            c.execute(f"UPDATE {self.table} SET {set_clause}{where}", tuple(vals))
            self.db.commit()

            c.execute(
                f"SELECT * FROM {self.table}{where}",
                tuple([f[2] for f in self.filters]),
            )
            rows = []
            for r in c.fetchall():
                d = self._maybe_json_decode(dict(r))
                rows.append(d)
            return MockData(rows[0] if self._single and rows else rows)

        elif self.action == "select":
            where = ""
            vals = []
            if self.filters:
                filter_texts = []
                for f in self.filters:
                    if f[1] == "IN":
                        filter_texts.append(f"{f[0]} IN ({','.join(['?'] * len(f[2]))})")
                        vals.extend(f[2])
                    else:
                        filter_texts.append(f"{f[0]} {f[1]} ?")
                        vals.append(f[2])
                where = " WHERE " + " AND ".join(filter_texts)

            query = f"SELECT * FROM {self.table}{where}"
            if self._order:
                query += f" ORDER BY {self._order[0]} {'DESC' if self._order[1] else 'ASC'}"
            if self._limit:
                query += f" LIMIT {self._limit}"

            c.execute(query, tuple(vals))

            rows = []
            for r in c.fetchall():
                rows.append(self._maybe_json_decode(dict(r)))

            if self._single:
                if not rows:
                    return MockData(None)
                return MockData(rows[0])
            return MockData(rows)

        elif self.action == "delete":
            where = ""
            vals = []
            if self.filters:
                where = " WHERE " + " AND ".join([f"{f[0]} {f[1]} ?" for f in self.filters])
                vals.extend([f[2] for f in self.filters])
            c.execute(f"DELETE FROM {self.table}{where}", tuple(vals))
            self.db.commit()
            return MockData([])


class MockSupabaseClient:
    def __init__(self):
        self.db = db_local.get_connection()
        self.auth = MockAuth(self.db)
        db_local.init_db()

    def table(self, table_name):
        return MockQuery(self.db, table_name)
