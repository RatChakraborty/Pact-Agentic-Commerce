from decimal import Decimal

import httpx

from .config import settings

BASE = "https://api-m.sandbox.paypal.com"


class ProviderError(Exception):
    pass


class PayPal:
    def __init__(self, transport=None):
        self.transport = transport

    def token(self):
        if settings.paypal_env != "sandbox":
            raise ProviderError("Only PayPal sandbox is supported.")
        if not settings.paypal_client_id or not settings.paypal_client_secret:
            raise ProviderError("Configure sandbox merchant credentials on the server.")
        try:
            with httpx.Client(timeout=25, transport=self.transport) as c:
                r = c.post(
                    BASE + "/v1/oauth2/token",
                    auth=(settings.paypal_client_id, settings.paypal_client_secret),
                    data={"grant_type": "client_credentials"},
                )
                if r.status_code != 200:
                    raise ProviderError(
                        f"PayPal sandbox authentication failed ({r.status_code})."
                    )
                return r.json()["access_token"]
        except (httpx.HTTPError, KeyError, ValueError):
            raise ProviderError(
                "PayPal sandbox authentication is unavailable."
            ) from None

    def request(self, method, path, body=None, key=None):
        token = self.token()
        try:
            with httpx.Client(timeout=25, transport=self.transport) as c:
                r = c.request(
                    method,
                    BASE + path,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "PayPal-Request-Id": key or "",
                        "Prefer": "return=representation",
                    },
                    json=body,
                )
                if r.status_code >= 400:
                    raise ProviderError(
                        f"PayPal sandbox request failed ({r.status_code}); no payment success has been recorded."
                    )
                return r.json() if r.content else {}
        except (httpx.HTTPError, ValueError):
            raise ProviderError(
                "PayPal request interrupted; retry uses the same operation identifier."
            ) from None

    def create(self, a):
        try:
            return self._create(a)
        except ProviderError:
            # Reconcile a lost create response by the durable, unique invoice number.
            try:
                found = self.request(
                    "POST",
                    "/v2/invoicing/search-invoices",
                    {"invoice_number": "PACT-" + a["id"][:20]},
                )
                matches = [
                    x
                    for x in found.get("items", [])
                    if x.get("detail", {}).get("invoice_number")
                    == "PACT-" + a["id"][:20]
                ]
                if len(matches) == 1:
                    return matches[0]
            except ProviderError:
                pass
            raise

    def _create(self, a):
        return self.request(
            "POST",
            "/v2/invoicing/invoices",
            {
                "detail": {
                    "invoice_number": "PACT-" + a["id"][:20],
                    "currency_code": "USD",
                    "note": "Pact sandbox landing-page agreement. Not escrow.",
                },
                "invoicer": {"email_address": a["seller_email"]},
                "primary_recipients": [
                    {"billing_info": {"email_address": a["buyer_email"]}}
                ],
                "items": [
                    {
                        "name": "Landing page milestone",
                        "description": a["objective"][:1000],
                        "quantity": "1",
                        "unit_amount": {
                            "currency_code": "USD",
                            "value": f"{Decimal(a['amount_minor']) / 100:.2f}",
                        },
                    }
                ],
            },
            a["id"],
        )

    def get(self, id):
        return self.request("GET", "/v2/invoicing/invoices/" + id)

    def send(self, id, key):
        return self.request(
            "POST",
            "/v2/invoicing/invoices/" + id + "/send",
            {"send_to_invoicer": False, "send_to_recipient": False},
            key + "-send",
        )

    def validate(self, invoice, a):
        expected = Decimal(a["amount_minor"]) / 100
        try:
            assert invoice["amount"]["currency_code"] == "USD"
            assert Decimal(invoice["amount"]["value"]) == expected
            assert (
                invoice["invoicer"]["email_address"].lower()
                == a["seller_email"].lower()
            )
            assert (
                invoice["primary_recipients"][0]["billing_info"][
                    "email_address"
                ].lower()
                == a["buyer_email"].lower()
            )
        except (KeyError, IndexError, AssertionError, ValueError):
            raise ProviderError(
                "Provider invoice terms do not match the accepted agreement."
            ) from None
        return invoice

    def public(self, invoice):
        from urllib.parse import urlparse

        url = invoice.get("detail", {}).get("metadata", {}).get("recipient_view_url")
        if url and (
            urlparse(url).scheme != "https"
            or urlparse(url).hostname
            not in {"www.sandbox.paypal.com", "sandbox.paypal.com"}
        ):
            url = None
        return {
            "id": invoice["id"],
            "status": invoice.get("status", "UNKNOWN"),
            "approval_url": url,
        }


paypal = PayPal()
