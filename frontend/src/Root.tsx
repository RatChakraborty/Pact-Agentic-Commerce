import { useEffect, useState } from "react";
import App from "./App";
import Market from "./Market";
import Replay from "./Replay";
import { PaymentPage } from "./PaymentVerification";
import { loadReplay, type ReplayEvidence } from "./replay";
import { money } from "./workflow";

function Brand() {
  return (
    <a className="brand" href="/">
      <span className="mark" aria-hidden="true">
        p
      </span>
      Pact
    </a>
  );
}
function Landing() {
  const [evidence, setEvidence] = useState<ReplayEvidence | null>(null);
  useEffect(() => {
    const c = new AbortController();
    loadReplay(c.signal)
      .then(setEvidence)
      .catch(() => {});
    return () => c.abort();
  }, []);
  const run = evidence?.runs[0];
  return (
    <>
      <header>
        <Brand />
        <nav className="payment-navigation" aria-label="Primary navigation">
          <a href="/payments">PayPal verification</a>
          <a className="nav-link" href="/agreements">
            Your agreements
          </a>
        </nav>
      </header>
      <main className="product-landing">
        <section className="product-hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow">A CLEARER WAY TO AGREE</span>
            <h1 id="hero-title">
              Agents negotiate.
              <br />
              <em>People decide.</em>
            </h1>
            <p className="hero-intro">
              Let agents find common ground. Review every offer, approve the
              commitments, and follow the evidence through to payment.
            </p>
            <p className="hero-support">
              Pact enforces the budget, recipient and scope—even when a model
              gets it wrong.
            </p>
            <div className="hero-actions">
              <a className="primary" href="/demo">
                Explore Pact <span aria-hidden="true">→</span>
              </a>
              <a className="text-link" href="/try">
                Try it yourself
              </a>
            </div>
            <p className="hero-caption">
              Genuine recorded AI. No login, credits or payment required.
            </p>
          </div>
          <section
            className="hero-ledger"
            aria-label="Authentic recorded negotiation preview"
          >
            <div className="ledger-heading">
              <span className="eyebrow">NEGOTIATION / RECORDED</span>
              <span className="state-chip pending">Proposal</span>
            </div>
            <h2>A studio landing page</h2>
            <p className="muted">Hero, features, contact. Fixed scope.</p>
            {run ? (
              <>
                <div className="ledger-cap">
                  <span>Buyer cap · recorded fixture</span>
                  <strong>{money(run.budget_minor)}</strong>
                </div>
                <ol className="ledger-offers">
                  {run.offers.map((o, i) => (
                    <li key={i}>
                      <span className="ledger-role">
                        {o.role === "buyer" ? "B" : "S"}
                      </span>
                      <div>
                        <span>
                          {o.role === "buyer"
                            ? "Buyer counteroffer"
                            : o.action === "accept"
                              ? "Seller accepts proposal"
                              : "Seller proposal"}
                        </span>
                        <small>
                          {o.action === "accept"
                            ? "Agent decision · no human approval"
                            : "Full required scope"}
                        </small>
                      </div>
                      <strong>{money(o.amount_minor)}</strong>
                    </li>
                  ))}
                </ol>
                <dl className="ledger-review">
                  <div>
                    <dt>Proposed terms</dt>
                    <dd>{money(run.amount_minor!)} · static HTML</dd>
                  </div>
                  <div>
                    <dt>Human approval</dt>
                    <dd className="pending-text">Required · not recorded</dd>
                  </div>
                  <div>
                    <dt>Agreement version</dt>
                    <dd>Not captured in this replay</dd>
                  </div>
                  <div>
                    <dt>Lock state</dt>
                    <dd>Not established by agent acceptance</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="muted">
                Explore Pact to inspect the versioned evidence.
              </p>
            )}
            <a className="ledger-source" href="/demo">
              Inspect the original offers <span aria-hidden="true">→</span>
            </a>
          </section>
        </section>
        <details className="demo-truth">
          <summary>What’s real in this demo?</summary>
          <p>
            The primary demo replays genuine recorded AI replies, including a
            model error rejected by Pact. It uses a static versioned asset and
            needs no database or paid API.
          </p>
          <p>
            A separate, dated PayPal sandbox receipt is provider-confirmed PAID.
            It belongs to its original invoice—not the replay or a new visitor
            contract.
          </p>
          <p>
            Try it yourself uses isolated demo identities and deterministic
            agents. Both people confirm terms; no real accounts or payments are
            created. Hosted interactive service health is separate from the
            recorded experience and remains under verification.
          </p>
          <a className="text-link" href="/demo">
            Inspect evidence and limitations
          </a>
        </details>
        <section className="product-lifecycle">
          <div>
            <span className="eyebrow">FROM INTENT TO EVIDENCE</span>
            <h2>
              A proposal is only
              <br />
              the beginning.
            </h2>
            <p className="muted">Each commitment has a visible boundary.</p>
          </div>
          <ol>
            <li>
              <span className="lifecycle-symbol pending-text">↔</span>
              <div>
                <h3>Agents propose</h3>
                <p>
                  Follow buyer and seller offers. Locked constraints stay
                  authoritative.
                </p>
              </div>
            </li>
            <li>
              <span className="lifecycle-symbol">◇</span>
              <div>
                <h3>People confirm</h3>
                <p>
                  Review the exact scope and price. Each required person
                  approves the same version.
                </p>
              </div>
            </li>
            <li>
              <span className="lifecycle-symbol">✓</span>
              <div>
                <h3>Evidence comes first</h3>
                <p>
                  Inspect deliverable checks and provider status. Financial
                  handoff requires buyer authorization.
                </p>
              </div>
            </li>
          </ol>
        </section>
        <section className="interactive-entry">
          <div>
            <span className="eyebrow">PUT IT INTO PRACTICE</span>
            <h2>Take your side of the agreement.</h2>
            <p>
              List a service or bring a brief. Two separate browser sessions
              share the same inspectable contract.
            </p>
          </div>
          <a className="text-link" href="/try">
            Try it yourself <span aria-hidden="true">→</span>
          </a>
        </section>
        <footer>
          <span>Pact · Agents negotiate. People decide.</span>
          <span>PayPal sandbox · MIT licensed</span>
        </footer>
      </main>
    </>
  );
}
function RoleSelection() {
  return (
    <>
      <header>
        <Brand />
        <a className="nav-link" href="/demo">
          Recorded demo
        </a>
      </header>
      <main className="role-selection">
        <span className="eyebrow">TRY IT YOURSELF</span>
        <h1>Which side are you on?</h1>
        <p>Agents can negotiate for you. You keep the final say.</p>
        <div className="role-choices">
          <a href="/customer">
            <span className="eyebrow">CUSTOMER</span>
            <h2>Bring a project.</h2>
            <p>
              Find a demo service, set a private budget, and review the deal.
            </p>
            <strong>I'm a customer →</strong>
          </a>
          <a href="/business">
            <span className="eyebrow">BUSINESS</span>
            <h2>Offer your craft.</h2>
            <p>
              List a service, protect your minimum, and confirm your
              commitments.
            </p>
            <strong>I'm a business →</strong>
          </a>
        </div>
        <details className="demo-truth" open>
          <summary>About the interactive experience</summary>
          <p>
            These are browser-bound demo identities, not registered accounts or
            verified businesses. Open the other role in a separate
            browser/private window. Deterministic agents use no model credits;
            this flow creates no invoice or payment.
          </p>
        </details>
        <p>
          <a className="text-link" href="/sandbox">
            Advanced single-player sandbox
          </a>
        </p>
      </main>
    </>
  );
}
export default function Root() {
  const path = window.location.pathname;
  const view =
    (
      {
        "/customer": "customer",
        "/business": "business",
        "/demo": "demo",
        "/payments": "payments",
        "/try": "try",
        "/sandbox": "workspace",
        "/agreements": "agreements",
      } as Record<string, string>
    )[path] || new URLSearchParams(window.location.search).get("view");
  if (view === "demo") return <Replay />;
  if (view === "payments") return <PaymentPage />;
  if (view === "try") return <RoleSelection />;
  if (view === "customer" || view === "business")
    return <Market entry={view === "customer" ? "buyer" : "seller"} />;
  if (view === "workspace" || view === "agreements") return <App />;
  return <Landing />;
}
