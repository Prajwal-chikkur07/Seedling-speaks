"""
Test setup: point the app at a throwaway sqlite DB *before* anything imports
database.py, so the suite can never touch the real Postgres from backend/.env.
Auth is stubbed via dependency_overrides; tests that need to exercise the real
401 path use the `unauthenticated` fixture.
"""
import os
import sys
import tempfile

_db_dir = tempfile.mkdtemp(prefix="backend-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_db_dir, 'test.db')}"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest  # noqa: E402

import database  # noqa: E402
import models  # noqa: E402,F401
from main import app  # noqa: E402
from services.clerk_auth import get_current_claims, get_current_user_id  # noqa: E402

assert database.IS_SQLITE, "tests must never run against a real database"
database.Base.metadata.create_all(bind=database.engine)

TEST_USER_ID = "user_test_a"


@pytest.fixture(autouse=True)
def fake_auth():
    app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
    app.dependency_overrides[get_current_claims] = lambda: {"sub": TEST_USER_ID}
    yield
    app.dependency_overrides.pop(get_current_user_id, None)
    app.dependency_overrides.pop(get_current_claims, None)


@pytest.fixture
def unauthenticated():
    """Remove the auth stub so the real Clerk dependency runs (no token → 401)."""
    app.dependency_overrides.pop(get_current_user_id, None)
    app.dependency_overrides.pop(get_current_claims, None)


@pytest.fixture(autouse=True)
def clean_db():
    yield
    with database.engine.begin() as conn:
        for table in reversed(database.Base.metadata.sorted_tables):
            conn.execute(table.delete())
