"""Canonical economic terms. A digest detects changes; it does not authenticate people."""

import hashlib
import json
from datetime import UTC, datetime

MATERIAL = (
    "version",
    "amount_minor",
    "currency",
    "seller_email",
    "buyer_email",
    "criteria",
    "objective",
    "deadline",
    "budget_minor",
)


class IntegrityError(ValueError):
    pass


def canonical_terms(a):
    terms = {k: a[k] for k in MATERIAL}
    terms["criteria"] = sorted(terms["criteria"])
    terms["deadline"] = (
        datetime.fromisoformat(terms["deadline"]).astimezone(UTC).isoformat()
    )
    terms["buyer_email"] = terms["buyer_email"].lower()
    terms["seller_email"] = terms["seller_email"].lower()
    terms["deliverable_type"] = "static_html"
    terms["approval_policy"] = "explicit_buyer_before_invoice_and_payment"
    return terms


def serialize_terms(a):
    return json.dumps(
        canonical_terms(a), sort_keys=True, separators=(",", ":"), ensure_ascii=False
    )


def digest(a):
    return hashlib.sha256(serialize_terms(a).encode()).hexdigest()


def verify_accepted(a):
    if not a.get("accepted_at"):
        return
    snapshot = a.get("accepted_terms")
    if not snapshot:
        raise IntegrityError("Accepted agreement is missing its locked terms.")
    # Old snapshots remain readable; compare every field they originally locked.
    current = canonical_terms(a)
    normalized_snapshot = canonical_terms({**a, **snapshot})
    for field, value in snapshot.items():
        if field in current and (
            normalized_snapshot.get(field) != current[field]
            or (field not in MATERIAL and value != current[field])
        ):
            raise IntegrityError(
                f"Accepted {field.replace('_', ' ')} changed. Create and approve a new agreement."
            )
    if a.get("accepted_digest") and digest(a) != a["accepted_digest"]:
        raise IntegrityError(
            "Accepted agreement integrity check failed. No provider action is permitted."
        )
