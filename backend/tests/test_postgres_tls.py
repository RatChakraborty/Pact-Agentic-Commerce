"""Real libpq TLS handshakes against an ephemeral loopback protocol fixture.

No database is created, no hosted endpoint is contacted, and no SQL is executed.
The peer deliberately refuses authentication only after completing trusted TLS.
"""

import socket
import ssl
import struct
import subprocess
import threading
from contextlib import contextmanager
from pathlib import Path

import certifi
import psycopg
import pytest
from app import postgres
from psycopg.conninfo import conninfo_to_dict


@pytest.fixture(scope="module")
def certificates(tmp_path_factory):
    root = tmp_path_factory.mktemp("pact-tls")
    commands = [
        [
            "req",
            "-x509",
            "-newkey",
            "rsa:2048",
            "-nodes",
            "-days",
            "1",
            "-subj",
            "/CN=Pact Fixture CA",
            "-keyout",
            "ca.key",
            "-out",
            "ca.pem",
        ],
        [
            "req",
            "-newkey",
            "rsa:2048",
            "-nodes",
            "-subj",
            "/CN=tls.pact.test",
            "-keyout",
            "server.key",
            "-out",
            "server.csr",
        ],
        [
            "x509",
            "-req",
            "-in",
            "server.csr",
            "-CA",
            "ca.pem",
            "-CAkey",
            "ca.key",
            "-CAcreateserial",
            "-days",
            "1",
            "-extfile",
            "extensions",
            "-out",
            "server.pem",
        ],
    ]
    (root / "extensions").write_text(
        "subjectAltName=DNS:tls.pact.test\nextendedKeyUsage=serverAuth\n"
    )
    for args in commands:
        subprocess.run(["openssl", *args], cwd=root, check=True, capture_output=True)
    return root


@contextmanager
def tls_peer(certificates):
    listener = socket.socket()
    listener.bind(("127.0.0.1", 0))
    listener.listen(1)
    listener.settimeout(5)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certificates / "server.pem", certificates / "server.key")
    observed = {"tls_completed": False, "startup_received": False}

    def receive(sock, size):
        data = b""
        while len(data) < size:
            chunk = sock.recv(size - len(data))
            if not chunk:
                break
            data += chunk
        return data

    def serve():
        try:
            with listener.accept()[0] as sock:
                sock.settimeout(5)
                if sock.recv(8, socket.MSG_WAITALL) != struct.pack("!II", 8, 80877103):
                    return
                sock.sendall(b"S")
                with context.wrap_socket(sock, server_side=True) as secured:
                    observed["tls_completed"] = True
                    header = receive(secured, 4)
                    if len(header) != 4:
                        return
                    length = struct.unpack("!I", header)[0]
                    receive(secured, length - 4)
                    observed["startup_received"] = True
                    payload = b"SFATAL\0C28000\0MFIXTURE_AUTH_AFTER_TLS\0\0"
                    secured.sendall(
                        b"E" + struct.pack("!I", len(payload) + 4) + payload
                    )
        except (ssl.SSLError, ConnectionError, TimeoutError):
            pass  # Expected when the client rejects a certificate.
        finally:
            listener.close()

    thread = threading.Thread(target=serve, daemon=True)
    thread.start()
    try:
        yield listener.getsockname()[1], observed
    finally:
        thread.join(timeout=6)
        listener.close()
        assert not thread.is_alive(), "TLS fixture must finish"


def fixture_url(port, host="tls.pact.test"):
    return f"postgresql://fixture:dummy@{host}:{port}/fixture?hostaddr=127.0.0.1&sslmode=disable&sslrootcert=/missing/url-ca.pem"


def test_explicit_ca_works_without_openssl_default_trust(
    certificates, monkeypatch, caplog
):
    monkeypatch.setenv("SSL_CERT_FILE", str(certificates / "missing.pem"))
    monkeypatch.setenv("SSL_CERT_DIR", str(certificates / "missing-directory"))
    monkeypatch.setattr(postgres.certifi, "where", lambda: str(certificates / "ca.pem"))
    with tls_peer(certificates) as (port, observed):
        with (
            pytest.raises(postgres.StorageUnavailable) as failure,
            postgres.transaction(fixture_url(port), hosted=True),
        ):
            pytest.fail("Fixture must refuse authentication")
        assert "FIXTURE_AUTH_AFTER_TLS" in str(failure.value.__cause__)
        assert observed["tls_completed"] and observed["startup_received"]
    assert "FIXTURE_AUTH_AFTER_TLS" not in caplog.text
    assert "fixture:dummy" not in caplog.text


def test_system_trust_failure_is_reproduced_without_a_default_ca(
    certificates, monkeypatch
):
    monkeypatch.setenv("SSL_CERT_FILE", str(certificates / "missing.pem"))
    monkeypatch.setenv("SSL_CERT_DIR", str(certificates / "missing-directory"))
    with tls_peer(certificates) as (port, observed):
        with pytest.raises(psycopg.OperationalError) as failure:
            psycopg.connect(
                fixture_url(port),
                sslmode="verify-full",
                sslrootcert="system",
                connect_timeout=3,
            )
        assert postgres.failure_code(failure.value) == "TLS_CONNECTION_FAILED"
        assert not observed["startup_received"]


def test_untrusted_server_certificate_still_fails_closed(certificates):
    with tls_peer(certificates) as (port, observed):
        with (
            pytest.raises(postgres.StorageUnavailable) as failure,
            postgres.transaction(fixture_url(port), hosted=True),
        ):
            pytest.fail("Untrusted CA must be rejected")
        assert postgres.failure_code(failure.value.__cause__) == "TLS_CONNECTION_FAILED"
        assert not observed["startup_received"]


def test_hostname_mismatch_still_fails_closed(certificates, monkeypatch):
    monkeypatch.setattr(postgres.certifi, "where", lambda: str(certificates / "ca.pem"))
    with tls_peer(certificates) as (port, observed):
        with (
            pytest.raises(postgres.StorageUnavailable) as failure,
            postgres.transaction(fixture_url(port, "wrong.pact.test"), hosted=True),
        ):
            pytest.fail("Wrong hostname must be rejected")
        assert postgres.failure_code(failure.value.__cause__) == "TLS_CONNECTION_FAILED"
        assert not observed["startup_received"]


@pytest.mark.parametrize(
    "host",
    [
        "ep-fixture.us-east-2.aws.neon.tech",
        "ep-fixture-pooler.us-east-2.aws.neon.tech",
        "localhost",
    ],
)
def test_connection_keywords_enforce_trust_and_preserve_endpoint(host, monkeypatch):
    seen = {}

    def inspect(url, **kwargs):
        seen.update(kwargs)
        seen["merged"] = conninfo_to_dict(
            url, **{k: kwargs[k] for k in ["sslmode", "sslrootcert", "connect_timeout"]}
        )
        raise psycopg.OperationalError("fixture stop")

    monkeypatch.setattr(postgres.psycopg, "connect", inspect)
    url = f"postgresql://fixture:dummy@{host}/pact?sslmode=disable&sslrootcert=/missing&channel_binding=require"
    with (
        pytest.raises(postgres.StorageUnavailable),
        postgres.transaction(url, hosted=True),
    ):
        pass
    assert seen["merged"]["sslmode"] == "verify-full"
    assert seen["merged"]["sslrootcert"] == certifi.where()
    assert seen["merged"]["host"] == host
    assert seen["merged"]["channel_binding"] == "require"
    assert seen["prepare_threshold"] is None


def test_packaged_ca_bundle_is_readable_and_contains_neon_root():
    assert Path(certifi.where()).is_file()
    context = ssl.create_default_context(cafile=certifi.where())
    assert any(
        ("commonName", "ISRG Root X1") in entry
        for certificate in context.get_ca_certs()
        for entry in certificate["subject"]
    )


def test_missing_packaged_ca_has_no_system_or_insecure_fallback(
    certificates, monkeypatch
):
    monkeypatch.setattr(
        postgres.certifi, "where", lambda: str(certificates / "missing.pem")
    )
    with tls_peer(certificates) as (port, observed):
        with (
            pytest.raises(postgres.StorageUnavailable) as failure,
            postgres.transaction(fixture_url(port), hosted=True),
        ):
            pytest.fail("Missing trust bundle must fail closed")
        assert postgres.tls_failure_reason(failure.value.__cause__) == "CA_FILE_MISSING"
        assert not observed["startup_received"]


@pytest.mark.parametrize(
    "generic_host,expected",
    [("ep-original.neon.tech", True), ("ep-different.neon.tech", False)],
)
def test_binding_override_diagnostic_never_changes_database_or_exposes_values(
    monkeypatch, generic_host, expected
):
    explicit = "postgresql://fixture:PRIVATE_PASSWORD@ep-original.neon.tech/pact?sslmode=require"
    generic = (
        f"postgresql://fixture:PRIVATE_PASSWORD@{generic_host}/pact?sslmode=verify-full"
    )
    monkeypatch.setenv("PACT_DATABASE_URL", explicit)
    monkeypatch.setenv("DATABASE_URL", generic)
    source, match = postgres.binding_diagnostics(explicit)
    assert source == "PACT_DATABASE_URL" and match is expected
    assert "PRIVATE_PASSWORD" not in str((source, match))
    assert "neon.tech" not in str((source, match))


@pytest.mark.parametrize(
    "message,expected",
    [
        (
            'server certificate does not match host name "PRIVATE_HOST"',
            "HOSTNAME_MISMATCH",
        ),
        ('root certificate file "PRIVATE_PATH" does not exist', "CA_FILE_MISSING"),
        ('could not read root certificate file "PRIVATE_PATH"', "CA_FILE_UNREADABLE"),
        (
            "SSL error: certificate verify failed PRIVATE_HOST",
            "CERTIFICATE_VERIFY_FAILED",
        ),
        ("server does not support SSL PRIVATE_HOST", "SERVER_TLS_UNAVAILABLE"),
    ],
)
def test_tls_subcategory_is_value_free(message, expected):
    assert postgres.tls_failure_reason(psycopg.OperationalError(message)) == expected
