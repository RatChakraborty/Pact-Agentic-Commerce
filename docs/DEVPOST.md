# Pact — Devpost draft

## Elevator pitch

Buyer and seller agents negotiate. Pact turns their proposals into inspectable commitments, with human consent, deterministic authorization, evidence checks and PayPal sandbox reconciliation.

## Inspiration

Agent commerce needs more than a persuasive conversation. Prices, recipients, scope, approvals and payment state must remain explicit when a model makes a mistake. We built Pact around the gap between proposing a deal and having authority to act on it.

## What it does

Explore Pact presents genuine recorded AI offers, an actual host rejection, a separate complete deterministic agreement fixture, and a separate verified $300 PayPal sandbox payment in one browser without credentials. An advanced marketplace supports service listings, invitations, customer requests, seller authorization, independent private limits, mutual confirmations, deliverable checks and shared saved history across isolated demo sessions.

The interface labels model proposals, host enforcement, human confirmations and provider facts separately. A visitor cannot pay their demo agreement by opening the historical receipt.

## How we built it

React/TypeScript/Vite frontend; Python/FastAPI backend; PostgreSQL persistence on the existing dedicated Neon database; signed browser sessions; transaction-scoped advisory locks; append-only audit; canonical version/fingerprint binding; bounded structured model adapter and deterministic policy rules. Remote PostgreSQL uses hostname/certificate verification with an explicit packaged CA bundle.

The recorded AI run uses GPT-4.1-mini through the existing bounded provider interface. The semantic critic has a replaceable structured interface for future research integration; no dedicated SLM was trained or deployed. The HTML verifier parses structural evidence without executing seller code.

## PayPal and sponsor technology

The sandbox adapter uses OAuth, Invoicing create/send/get, invoice-number search recovery, provider-returned hosted checkout links and validated status reconciliation. Historical invoice `INV2-N6CJ-RJXM-96WT-XDVG` is provider-confirmed PAID for $300 USD, with zero due. Creation and buyer-authorized handoff are distinct events; no escrow or automatic release is claimed.

Public provider writes and paid inference remain disabled. Hosted operator checkout and webhooks are not claimed as completed. Optional sponsor contributions and limitations are reported in `docs/SPONSORS.md`; no APIMatic context-plugin invocation, AG Studio agent integration, or prize eligibility is invented.

## Challenges

Separating private counterpart constraints from shared contract data; binding consent to exact terms; handling malformed/non-converging model offers and stale authorization; distinguishing provider state from local assumptions; recovering a serverless Python startup/configuration issue and a binary-driver CA trust issue without disabling verification; making a genuine two-party product understandable in a single-browser judge demo.

## Accomplishments

Authentic recorded feasible/infeasible model runs; actual policy rejection; tested mutual-confirmation lifecycle; version/fingerprint and concurrency controls; real historical PayPal sandbox payment and reconciliation; a credential-free, database-independent guided demonstration with honest evidence provenance.

## Evaluation and lessons

The retained two live negotiation cases made six model calls: three-turn $300 agreement and three-turn blocked infeasible case. Usage and estimates are saved, not presented as billing receipts. The recorded semantic evaluation contains 20 successful reviews across 27 attempts: contradictions 6/6, ambiguity/abstention 6/6, legitimate proposals passed 7/8 (one false escalation). Small fixed samples and follow-up attempts limit generalization.

The final offline rerun covers ten negotiation scenarios with all ten expected outcomes and zero authorization violations. The deterministic critic detects 4/6 contradictions, while the recorded model-assisted result detects 6/6 on that fixed set. These are separate executions; no new paid inference was used for the release.

## What's next

Independent external agent transport, stronger real identity/merchant onboarding, a secure shared real-payment adapter, independently evaluated semantic critics, and verified webhook reconciliation. Each extension must preserve human financial authority and truthful provider state.

## Setup, tests and limitations

See README for Python 3.12/uv and Node setup, full suite commands, optional disposable local PostgreSQL tests and evidence reproduction. Never reset hosted Neon fixtures. Public personas are demo identities. A structural PASS is limited evidence, not a quality/legal guarantee. Final integrated hosted acceptance and Production URL must be filled only after actual verification; do not substitute the healthy historical core deployment or local test results.

- Project URL: **pending verified Production release**.
- Repository: https://github.com/RatChakraborty/Pact-Agentic-Commerce
- Video: **pending recording/upload**.
- License: MIT.
