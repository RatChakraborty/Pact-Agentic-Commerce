"""PostgreSQL transaction adapter. Every critical transaction shares one DB advisory lock.
The new dedicated Pact database uses its own schema; no Redis/other project is read.
"""

import logging
import re
from contextlib import contextmanager
from urllib.parse import urlparse

import psycopg
from psycopg.rows import dict_row

LOCK_ID = 174334001
SCHEMA = """
CREATE SCHEMA IF NOT EXISTS pact;
SET LOCAL search_path TO pact;
CREATE TABLE IF NOT EXISTS demo_records(id TEXT PRIMARY KEY, kind TEXT NOT NULL, owner TEXT NOT NULL, data TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS demo_records_kind_owner ON demo_records(kind,owner);
CREATE TABLE IF NOT EXISTS agreements(id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS agreements_owner ON agreements(owner);
CREATE TABLE IF NOT EXISTS audit(seq BIGSERIAL PRIMARY KEY, agreement_id TEXT NOT NULL REFERENCES agreements(id), timestamp TEXT NOT NULL, action TEXT NOT NULL, prior_status TEXT, next_status TEXT, details TEXT NOT NULL);
CREATE OR REPLACE FUNCTION pact.reject_audit_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'append only'; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='audit_immutable' AND tgrelid='pact.audit'::regclass) THEN CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON pact.audit FOR EACH ROW EXECUTE FUNCTION pact.reject_audit_change(); END IF; END $$;
CREATE TABLE IF NOT EXISTS usage(id INTEGER PRIMARY KEY CHECK(id=1), calls INTEGER NOT NULL);
INSERT INTO usage VALUES(1,0) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS budget(id INTEGER PRIMARY KEY CHECK(id=1), reserved_usd DOUBLE PRECISION NOT NULL);
INSERT INTO budget VALUES(1,0) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS ai_reservations(seq BIGSERIAL PRIMARY KEY, timestamp TEXT, purpose TEXT, calls INTEGER, reserved_usd DOUBLE PRECISION);
CREATE TABLE IF NOT EXISTS ai_observations(seq BIGSERIAL PRIMARY KEY, timestamp TEXT, purpose TEXT, data TEXT);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, expires BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS throttles(id TEXT PRIMARY KEY, window_id BIGINT NOT NULL, count INTEGER NOT NULL);
"""


class StorageUnavailable(Exception):
    pass


class Row(dict):
    def __getitem__(self, key):
        return (
            tuple(self.values())[key]
            if isinstance(key, int)
            else super().__getitem__(key)
        )


class Cursor:
    def __init__(self, cursor):
        self.cursor = cursor

    def fetchone(self):
        row = self.cursor.fetchone()
        return Row(row) if row is not None else None

    def fetchall(self):
        return [Row(row) for row in self.cursor.fetchall()]

    def __iter__(self):
        for row in self.cursor:
            yield Row(row)


class Database:
    def __init__(self, connection):
        self.connection = connection

    def execute(self, sql, params=()):
        sql = sql.replace("?", "%s").replace(
            "ORDER BY rowid DESC", "ORDER BY (data::jsonb->>'created_at') DESC, id DESC"
        )
        if re.match(r"INSERT OR IGNORE ", sql, re.IGNORECASE):
            sql = (
                re.sub(
                    r"INSERT OR IGNORE ", "INSERT ", sql, flags=re.IGNORECASE
                ).rstrip(";")
                + " ON CONFLICT DO NOTHING"
            )
        return Cursor(self.connection.execute(sql, params))

    def commit(self):
        self.connection.commit()

    def rollback(self):
        self.connection.rollback()


def failure_code(exc):
    # Only categorical diagnostics reach logs; driver messages can contain DSNs.
    message = str(exc).lower()
    if "resolve" in message or "name or service" in message:
        return "DNS_RESOLUTION_FAILED"
    if "certificate" in message or "ssl" in message:
        return "TLS_CONNECTION_FAILED"
    if "timeout" in message or "timed out" in message:
        return "CONNECTION_TIMEOUT"
    if getattr(exc, "sqlstate", None) == "42501":
        return "DATABASE_PERMISSION_DENIED"
    if getattr(exc, "sqlstate", None) in {"42P01", "3F000"}:
        return "DATABASE_OBJECT_MISSING"
    return "DATABASE_OPERATION_FAILED"


@contextmanager
def transaction(url, hosted=False):
    connection = None
    try:
        local = (
            urlparse(url).hostname in {"127.0.0.1", "localhost", "::1"} and not hosted
        )
        connection = psycopg.connect(
            url,
            connect_timeout=5,
            prepare_threshold=None,
            row_factory=dict_row,
            sslmode="disable" if local else "verify-full",
            **({} if local else {"sslrootcert": "system"}),
        )
        connection.execute("SET LOCAL lock_timeout = '8s'")
        connection.execute("SET LOCAL statement_timeout = '15s'")
        connection.execute("SELECT pg_advisory_xact_lock(%s)", (LOCK_ID,))
        connection.execute(SCHEMA, prepare=False)
        yield Database(connection)
        connection.commit()
    except psycopg.Error as exc:
        logging.getLogger("pact.storage").error(
            "PACT_STORAGE_FAILURE code=%s sqlstate=%s type=%s",
            failure_code(exc),
            getattr(exc, "sqlstate", None),
            type(exc).__name__,
        )
        if connection:
            connection.rollback()
        raise StorageUnavailable(
            "Persistent storage is unavailable; no fallback state was used."
        ) from exc
    except Exception:
        if connection:
            connection.rollback()
        raise
    finally:
        if connection:
            connection.close()
