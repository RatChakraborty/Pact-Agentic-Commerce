import json
import sqlite3
from contextlib import contextmanager

from .config import settings
from .domain import Agreement, AuditEvent, now


@contextmanager
def transaction():
    if settings.pact_database_url:
        from .postgres import transaction as postgres_transaction

        with postgres_transaction(
            settings.pact_database_url, settings.vercel
        ) as database:
            yield database
        return
    if settings.vercel:
        from .postgres import StorageUnavailable

        raise StorageUnavailable(
            "A dedicated PostgreSQL database is required on Vercel."
        )
    db = sqlite3.connect(settings.database_path, timeout=60)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    db.executescript("""CREATE TABLE IF NOT EXISTS agreements(id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit(seq INTEGER PRIMARY KEY AUTOINCREMENT, agreement_id TEXT NOT NULL, timestamp TEXT NOT NULL, action TEXT NOT NULL, prior_status TEXT, next_status TEXT, details TEXT NOT NULL);
    CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'append only'); END;
    CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'append only'); END;
    CREATE TABLE IF NOT EXISTS usage(id INTEGER PRIMARY KEY CHECK(id=1), calls INTEGER NOT NULL);
    INSERT OR IGNORE INTO usage VALUES(1,0);
    CREATE TABLE IF NOT EXISTS budget(id INTEGER PRIMARY KEY CHECK(id=1), reserved_usd REAL NOT NULL);
    INSERT OR IGNORE INTO budget VALUES(1,0);
    CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS throttles(id TEXT PRIMARY KEY, window_id INTEGER NOT NULL, count INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS ai_reservations(seq INTEGER PRIMARY KEY, timestamp TEXT, purpose TEXT, calls INTEGER, reserved_usd REAL);
    CREATE TABLE IF NOT EXISTS ai_observations(seq INTEGER PRIMARY KEY, timestamp TEXT, purpose TEXT, data TEXT);""")
    db.execute("BEGIN IMMEDIATE")
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def save(db, a):
    a = Agreement.model_validate(a).model_dump(mode="json")
    db.execute("UPDATE agreements SET data=? WHERE id=?", (json.dumps(a), a["id"]))


def audit(db, a, action, prior=None, details=None):
    AuditEvent(
        agreement_id=a["id"],
        timestamp=now(),
        action=action,
        prior_status=prior,
        next_status=a["status"],
        details=details or {},
    )
    db.execute(
        "INSERT INTO audit(agreement_id,timestamp,action,prior_status,next_status,details) VALUES(?,?,?,?,?,?)",
        (a["id"], now(), action, prior, a["status"], json.dumps(details or {})),
    )
