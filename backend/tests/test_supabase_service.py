from db import supabase_service


class _FakeMissingTableError(Exception):
    def __init__(self, table_name: str):
        super().__init__(
            {
                "code": "PGRST205",
                "message": f"Could not find the table 'public.{table_name}' in the schema cache",
                "details": None,
                "hint": None,
            }
        )


class _FakeQuery:
    def __init__(self, table_name: str):
        self.table_name = table_name

    def select(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def execute(self):
        raise _FakeMissingTableError(self.table_name)


class _FakeClient:
    def table(self, table_name: str):
        return _FakeQuery(table_name)


def test_check_supabase_health_marks_schema_setup_required(monkeypatch):
    monkeypatch.setattr(supabase_service, "supabase_client", _FakeClient())

    health = supabase_service.check_supabase_health()

    assert health["status"] == "degraded"
    assert health["setup_required"] is True
    assert health["table_accessible"] is False
    assert health["schema_file"].endswith("backend\\db\\supabase_schema.sql")


def test_followup_queries_return_empty_when_schema_missing(monkeypatch):
    monkeypatch.setattr(supabase_service, "supabase_client", _FakeClient())

    jobs = __import__("asyncio").run(supabase_service.get_pending_followup_jobs())

    assert jobs == []
