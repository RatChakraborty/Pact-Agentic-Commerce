from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, EmailStr, AwareDatetime

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid')

class NewAgreement(Strict):
    objective: str = Field(default='Build a focused landing page for a local design studio.', min_length=10,max_length=1000)
    budget_minor: int = Field(default=30000, ge=100,le=100000,strict=True)
    asking_minor: int = Field(default=36000,ge=100,le=200000,strict=True)
    seller_floor_minor: int = Field(default=24000,ge=100,le=100000,strict=True)
    buyer_email: EmailStr
    seller_email: EmailStr
    deadline: AwareDatetime
    criteria: list[Literal['hero','features','contact']] = Field(default=['hero','features','contact'],min_length=1,max_length=3)
    mode: Literal['deterministic','live'] = 'deterministic'

class Offer(Strict):
    action: Literal['counter','accept','abstain']
    amount_minor: int = Field(ge=100,le=200000,strict=True)
    currency: Literal['USD']
    recipient: str
    criteria: list[Literal['hero','features','contact']] = Field(min_length=1,max_length=3)
    explanation: str = Field(min_length=1,max_length=600)

class Approval(Strict):
    version: int
    confirmed: Literal[True]

class Evidence(Strict):
    html: str = Field(min_length=1,max_length=100000)

class Review(Strict):
    accepted: bool
    reason: str = Field(min_length=10,max_length=500)

class Negotiate(Strict):
    scenario: Literal['normal','overspend','recipient-swap'] = 'normal'

def now():
    return datetime.now(timezone.utc).isoformat()
