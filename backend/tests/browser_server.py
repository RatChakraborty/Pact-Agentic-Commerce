"""Loopback-only browser test harness. Never use this entry point for the product."""

from app import main
from app.main import app
from test_workflow import FakePayPal

fake = FakePayPal()
main.paypal = fake


@app.post("/__test/provider-paid")
def mark_mock_paid():
    fake.state = "PAID"
    return {"mock": True, "status": "PAID"}


# Product static mount is deliberately last; insert this test-only route before it.
app.router.routes.insert(0, app.router.routes.pop())
