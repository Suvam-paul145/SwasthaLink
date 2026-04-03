"""
Mock Supabase client backed by local SQLite.
Used for local development without a real Supabase instance.
"""

import sqlite3
import uuid
import json
import db.local as db_local


class MockData:
    def __init__(self, data):
        self.data = data


class MockUser:
    def __init__(self, user_id):
        self.id = user_id


class MockSession:
    def __init__(self):
        self.access_token = "mock-jwt-token"


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

        c = self.db.cursor()
        try:
            c.execute(
                "INSERT INTO profiles (id, user_id, email, password_hash, full_name, role, phone, phone_verified) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (user_id, user_id, email, password, data.get("full_name", ""),
                 data.get("role", "patient"), data.get("phone", ""), 0),
            )
            self.db.commit()
        except sqlite3.IntegrityError:
            self.db.rollback()
            raise Exception("User already registered")
        return MockAuthResponse(MockUser(user_id))

    def sign_in_with_password(self, payload):
        email = payload.get("email")
        password = payload.get("password")
        c = self.db.cursor()
        c.execute("SELECT * FROM profiles WHERE email=? AND password_hash=?", (email, password))
        row = c.fetchone()
        if not row:
            raise Exception("Invalid login credentials")
        return MockAuthResponse(MockUser(row['user_id']), session=MockSession())


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
                d = dict(r)
                if 'medications' in d and isinstance(d['medications'], str):
                    try:
                        d['medications'] = json.loads(d['medications'])
                    except Exception:
                        pass
                if 'event_data' in d and isinstance(d['event_data'], str):
                    try:
                        d['event_data'] = json.loads(d['event_data'])
                    except Exception:
                        pass
                if 'tests' in d and isinstance(d['tests'], str):
                    try:
                        d['tests'] = json.loads(d['tests'])
                    except Exception:
                        d['tests'] = []
                if 'patient_insights' in d and isinstance(d['patient_insights'], str):
                    try:
                        d['patient_insights'] = json.loads(d['patient_insights'])
                    except Exception:
                        d['patient_insights'] = None
                if 'data' in d and isinstance(d['data'], str):
                    try:
                        d['data'] = json.loads(d['data'])
                    except Exception:
                        d['data'] = {}
                if 'details' in d and isinstance(d['details'], str):
                    try:
                        d['details'] = json.loads(d['details'])
                    except Exception:
                        d['details'] = {}
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
                d = dict(r)
                if 'medications' in d and isinstance(d['medications'], str):
                    try:
                        d['medications'] = json.loads(d['medications'])
                    except Exception:
                        pass
                if 'event_data' in d and isinstance(d['event_data'], str):
                    try:
                        d['event_data'] = json.loads(d['event_data'])
                    except Exception:
                        pass
                if 'tests' in d and isinstance(d['tests'], str):
                    try:
                        d['tests'] = json.loads(d['tests'])
                    except Exception:
                        d['tests'] = []
                if 'patient_insights' in d and isinstance(d['patient_insights'], str):
                    try:
                        d['patient_insights'] = json.loads(d['patient_insights'])
                    except Exception:
                        d['patient_insights'] = None
                if 'data' in d and isinstance(d['data'], str):
                    try:
                        d['data'] = json.loads(d['data'])
                    except Exception:
                        d['data'] = {}
                if 'details' in d and isinstance(d['details'], str):
                    try:
                        d['details'] = json.loads(d['details'])
                    except Exception:
                        d['details'] = {}
                rows.append(d)

            if self._single:
                if not rows:
                    return MockData(None)
                return MockData(rows[0])
            return MockData(rows)


class MockSupabaseClient:
    def __init__(self):
        self.db = db_local.get_connection()
        self.auth = MockAuth(self.db)
        db_local.init_db()

    def table(self, table_name):
        return MockQuery(self.db, table_name)
