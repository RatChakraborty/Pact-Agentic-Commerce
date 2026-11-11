from datetime import UTC, datetime
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, EmailStr, Field


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class NewAgreement(Strict):
    objective: str = Field(
        default="Build a focused landing page for a local design studio.",
        min_length=10,
        max_length=1000,
    )
    budget_minor: int = Field(default=30000, ge=100, le=100000, strict=True)
    asking_minor: int = Field(default=36000, ge=100, le=200000, strict=True)
    seller_floor_minor: int = Field(default=24000, ge=100, le=100000, strict=True)
    buyer_email: EmailStr
    seller_email: EmailStr
    deadline: AwareDatetime
    criteria: list[Literal["hero", "features", "contact"]] = Field(
        default=["hero", "features", "contact"], min_length=1, max_length=3
    )
    mode: Literal["deterministic", "live"] = "deterministic"


class Offer(Strict):
    action: Literal["counter", "accept", "abstain"]
    amount_minor: int = Field(ge=100, le=200000, strict=True)
    currency: Literal["USD"]
    recipient: str
    criteria: list[Literal["hero", "features", "contact"]] = Field(
        min_length=1, max_length=3
    )
    explanation: str = Field(min_length=1, max_length=600)


class Approval(Strict):
    version: int
    confirmed: Literal[True]
    terms_digest: str | None = None


class Evidence(Strict):
    html: str = Field(min_length=1, max_length=100000)


class Review(Strict):
    accepted: bool
    reason: str = Field(min_length=10, max_length=500)


class Negotiate(Strict):
    scenario: Literal["normal", "overspend", "recipient-swap"] = "normal"


def now():
    return datetime.now(UTC).isoformat()


class Buyer(Strict):
    email: EmailStr
    max_budget_minor: int = Field(ge=100)


class Seller(Strict):
    email: EmailStr
    asking_minor: int = Field(ge=100)
    minimum_minor: int = Field(ge=100)


class OfferTrace(Offer):
    role: Literal["buyer", "seller"]
    blocked: str | None = None


class Negotiation(Strict):
    offers: list[OfferTrace] = Field(max_length=6)
    amount_minor: int | None
    error: str | None


class MilestoneCheck(Strict):
    criterion: str
    passed: bool
    evidence: str


class VerificationResult(Strict):
    checks: list[MilestoneCheck]
    overall: Literal["PASS", "FAIL", "NEEDS_REVIEW"]
    agreement_version: int
    evaluated_at: str
    verifier_version: str
    limitation: str


class PaymentRecord(Strict):
    id: str
    status: str
    approval_url: str | None
    checked_at: str


class HumanReview(Strict):
    accepted: bool
    reason: str
    at: str


State = Literal[
    "DRAFT",
    "NEGOTIATING",
    "NEGOTIATION_FAILED",
    "PROPOSED",
    "ACCEPTED",
    "INVOICED",
    "NEEDS_REVIEW",
    "VERIFIED",
    "PAYMENT_PENDING",
    "PAID",
    "PAYMENT_REVIEW",
    "CANCELLED",
]


class Agreement(NewAgreement):
    id: str
    version: int
    status: State
    currency: Literal["USD"]
    amount_minor: int | None
    offers: list[OfferTrace]
    invoice: PaymentRecord | None
    verification: VerificationResult | None
    accepted_at: str | None
    approved_at: str | None
    created_at: str
    accepted_terms: dict | None = None
    human_review: HumanReview | None = None
    invoice_provider_id: str | None = None
    negotiation_error: str | None = None
    terms_digest: str | None = None
    accepted_digest: str | None = None
    critique: dict | None = None


class AuditEvent(Strict):
    agreement_id: str
    timestamp: str
    action: str
    prior_status: State | None
    next_status: State
    details: dict
