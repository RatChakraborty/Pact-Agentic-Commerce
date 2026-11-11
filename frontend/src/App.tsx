import { useState, useEffect, type FormEvent } from "react";
import { money, nextAction } from "./workflow";
type Agreement = {
  id: string;
  terms_digest?: string;
  critique?: {
    verdict: string;
    explanation: string;
    execution: string;
    model?: string;
    terms_digest: string;
  };
  objective: string;
  status: string;
  version: number;
  mode: string;
  budget_minor: number;
  amount_minor: number | null;
  seller_email: string;
  buyer_email: string;
  criteria: string[];
  deadline: string;
  offers: {
    role: string;
    amount_minor: number;
    action: string;
    explanation: string;
    blocked: string | null;
  }[];
  negotiation_error?: string;
  invoice: null | {
    id: string;
    status: string;
    approval_url: string | null;
    checked_at: string;
  };
  verification: null | {
    overall: string;
    checks: { criterion: string; passed: boolean; evidence: string }[];
    limitation: string;
  };
};
async function api(path: string, body?: unknown) {
  const r = await fetch("/api" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "X-Pact-Action": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok)
    throw Error(
      typeof d.detail === "string"
        ? d.detail
        : "Check the required fields and try again.",
    );
  return d;
}
const labels: Record<string, string> = {
  DRAFT: "Ready to negotiate",
  NEGOTIATING: "Agents are negotiating",
  PROPOSED: "Ready for your review",
  ACCEPTED: "Terms accepted",
  INVOICED: "Awaiting deliverable",
  VERIFIED: "Ready for payment review",
  NEEDS_REVIEW: "Evidence needs review",
  PAYMENT_PENDING: "Awaiting PayPal payment",
  PAID: "Payment confirmed",
  NEGOTIATION_FAILED: "No agreement reached",
  CANCELLED: "Cancelled",
  PAYMENT_REVIEW: "Provider status needs review",
};
const guidance: Record<string, string> = {
  DRAFT: "Two agents will work toward a price. You keep the final say.",
  PROPOSED:
    "Review price, scope, recipient and deadline. Accepting locks the terms; it does not pay the seller.",
  ACCEPTED:
    "Create a payment request using your accepted terms. No money is reserved or transferred.",
  INVOICED:
    "Submit the landing-page HTML. Pact checks its structure without running it.",
  VERIFIED:
    "Review the evidence and amount before continuing to PayPal. Confirm payment separately there.",
  NEEDS_REVIEW: "Submit revised evidence or record an explicit human review.",
  PAYMENT_PENDING:
    "Complete payment in PayPal sandbox, then check the provider status here.",
  PAID: "PayPal confirms this invoice is paid. Your agreement and history are saved.",
  NEGOTIATION_FAILED: "No terms were accepted and no payment was authorized.",
};
export default function App() {
  const [a, setA] = useState<Agreement | null>(null),
    [list, setList] = useState<Agreement[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [menu, setMenu] = useState(false),
    [fresh, setFresh] = useState(false),
    [scenario, setScenario] = useState("normal"),
    [events, setEvents] = useState<any[]>([]),
    [review, setReview] = useState(false),
    [health, setHealth] = useState<any>(null);
  useEffect(() => {
    api("/agreements")
      .then((l) => {
        setList(l);
        setA(l[0] || null);
      })
      .catch((e) => setError(e.message));
    api("/health")
      .then(setHealth)
      .catch(() => {});
  }, []);
  async function run(fn: () => Promise<Agreement>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const x = await fn();
      setA(x);
      setList(await api("/agreements"));
      setEvents([]);
      setNotice("Agreement updated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(async () => {
      const x = await api("/agreements", {
        objective: f.get("objective"),
        budget_minor: Math.round(Number(f.get("budget")) * 100),
        asking_minor: Math.round(Number(f.get("asking")) * 100),
        seller_floor_minor: Math.round(Number(f.get("floor")) * 100),
        buyer_email: f.get("buyer"),
        seller_email: f.get("seller"),
        deadline: new Date(String(f.get("deadline"))).toISOString(),
        criteria: ["hero", "features", "contact"],
        mode: f.get("mode"),
      });
      setFresh(false);
      return x;
    });
  }
  function act(action: string) {
    if (a)
      run(() =>
        api(
          `/agreements/${a.id}/${action}`,
          action === "negotiate"
            ? { scenario }
            : ["cancel", "paypal-status"].includes(action)
              ? {}
              : {
                  version: a.version,
                  confirmed: true,
                  terms_digest: a.terms_digest,
                },
        ),
      );
  }
  const primary = a ? nextAction(a.status) : null;
  return (
    <>
      <header>
        <a className="brand" href="/">
          <span className="mark">p</span>Pact{" "}
          <span className="sandbox">Sandbox</span>
        </a>
        <button
          className="quiet"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          Workspace {menu ? "−" : "+"}
        </button>
      </header>
      {menu && (
        <section className="menu">
          <h2>Your agreements</h2>
          <button
            onClick={() => {
              setFresh(true);
              setMenu(false);
            }}
          >
            New agreement
          </button>
          {list.map((x) => (
            <button
              className="history"
              key={x.id}
              onClick={() => {
                setA(x);
                setFresh(false);
                setMenu(false);
                setEvents([]);
              }}
            >
              {x.objective}
              <small>{labels[x.status]}</small>
            </button>
          ))}
          <details>
            <summary>Connection details</summary>
            <p>
              Sandbox payments:{" "}
              {health?.paypal_configured ? "configured" : "not configured"}.
              Live AI:{" "}
              {health?.live_ai_configured ? "configured" : "not configured"}.
            </p>
            <p>
              This local demo owns agreements through this browser session. Use
              sandbox accounts only.
            </p>
          </details>
        </section>
      )}
      <main>
        <div className="eyebrow">AGREE WITH CONFIDENCE</div>
        <h1>
          {a && !fresh
            ? "Your agreement."
            : "Good work starts\nwith clear terms."}
        </h1>
        <p className="intro">
          Your agents negotiate. You approve the terms and payment.
        </p>
        {error && (
          <div role="alert" className="message error">
            {error}
            <button
              className="quiet"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}
        {notice && (
          <p role="status" className="message">
            {notice}
          </p>
        )}
        {!a || fresh ? (
          <form className="setup" onSubmit={create}>
            <div className="section-heading">
              <h2>What would you like to build?</h2>
              <span>01 / Brief</span>
            </div>
            <label>
              Objective
              <textarea
                name="objective"
                required
                minLength={10}
                maxLength={1000}
                defaultValue="Build a focused landing page for a local design studio."
              />
            </label>
            <div className="form-grid">
              <label>
                Maximum budget (USD)
                <input
                  name="budget"
                  type="number"
                  step="0.01"
                  min="1"
                  max="1000"
                  defaultValue="300"
                  required
                />
              </label>
              <label>
                Delivery deadline
                <input
                  name="deadline"
                  type="datetime-local"
                  required
                  defaultValue={new Date(Date.now() + 7 * 86400000)
                    .toISOString()
                    .slice(0, 16)}
                />
              </label>
              <label>
                Sandbox buyer email
                <input
                  name="buyer"
                  type="email"
                  required
                  placeholder="Buyer test account"
                />
              </label>
              <label>
                Sandbox merchant email
                <input
                  name="seller"
                  type="email"
                  required
                  placeholder="Merchant test account"
                />
              </label>
            </div>
            <p className="scope">
              Deliverable: static HTML with hero, features and contact sections.
              Structural checks only.
            </p>
            <details>
              <summary>Negotiation preferences</summary>
              <div className="form-grid">
                <label>
                  Seller asking price (USD)
                  <input
                    name="asking"
                    type="number"
                    step="0.01"
                    min="1"
                    max="2000"
                    defaultValue="360"
                    required
                  />
                </label>
                <label>
                  Seller minimum (USD)
                  <input
                    name="floor"
                    type="number"
                    step="0.01"
                    min="1"
                    max="1000"
                    defaultValue="240"
                    required
                  />
                </label>
                <label>
                  Agent execution
                  <select name="mode">
                    <option value="deterministic">
                      Deterministic demo · no AI calls
                    </option>
                    <option value="live">Live AI · up to 6 turns</option>
                  </select>
                </label>
              </div>
            </details>
            <div className="action-row">
              <p>You approve all final terms and payments.</p>
              <button className="primary" disabled={busy}>
                {busy ? "Creating…" : "Create agreement →"}
              </button>
              {fresh && (
                <button
                  className="quiet"
                  type="button"
                  onClick={() => setFresh(false)}
                >
                  Back
                </button>
              )}
            </div>
          </form>
        ) : (
          <>
            <section className="objective">
              <div>
                <span className="eyebrow">CURRENT OBJECTIVE</span>
                <h2>{a.objective}</h2>
              </div>
              <span className="status">{labels[a.status] || a.status}</span>
            </section>
            <section className="next">
              <div>
                <span className="eyebrow">YOUR NEXT STEP</span>
                <h3>
                  {primary?.label ||
                    (a.status === "PAYMENT_PENDING"
                      ? "Complete payment in PayPal"
                      : a.status === "INVOICED" || a.status === "NEEDS_REVIEW"
                        ? "Submit your deliverable"
                        : labels[a.status])}
                </h3>
                <p>
                  {guidance[a.status] ||
                    "Review your agreement history for details."}
                </p>
                {["PROPOSED", "VERIFIED"].includes(a.status) && (
                  <p className="approval-summary">
                    {a.status === "PROPOSED" ? "Review" : "Authorize"}{" "}
                    {money(a.amount_minor!)} to {a.seller_email}.
                    {a.status === "VERIFIED"
                      ? " PayPal will ask you to confirm payment."
                      : " No payment is made by accepting."}
                  </p>
                )}
              </div>
              {primary && (
                <button
                  className="primary"
                  disabled={
                    busy ||
                    (primary.action === "accept" &&
                      !!a.critique &&
                      a.critique.verdict !== "CLEAR")
                  }
                  onClick={() => act(primary.action)}
                >
                  {busy ? "Working…" : primary.label + " →"}
                </button>
              )}
              {a.status === "PAYMENT_PENDING" && a.invoice?.approval_url && (
                <a
                  className="primary"
                  href={a.invoice.approval_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Continue in PayPal ↗
                </a>
              )}
              {["INVOICED", "NEEDS_REVIEW"].includes(a.status) && (
                <button
                  className="primary"
                  onClick={() =>
                    document
                      .getElementById("evidence-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Submit evidence →
                </button>
              )}
              {a.invoice && (
                <button
                  className="quiet"
                  disabled={busy}
                  onClick={() => act("paypal-status")}
                >
                  Check PayPal status
                </button>
              )}
            </section>
            <div className="workspace">
              <section className="negotiation">
                <div className="section-heading">
                  <h2>The negotiation</h2>
                  <span>
                    {a.mode === "live" ? "Live AI" : "Deterministic demo"}
                  </span>
                </div>
                {a.offers.length ? (
                  <ol className="timeline">
                    {a.offers.map((o, i) => (
                      <li key={i}>
                        <div className="avatar">
                          {o.role === "buyer" ? "B" : "S"}
                        </div>
                        <div>
                          <div className="offer-heading">
                            <strong>
                              {o.role === "buyer"
                                ? "Buyer agent"
                                : "Seller agent"}
                            </strong>
                            <span>
                              {o.action === "accept" ? "Accepts" : "Proposes"}{" "}
                              {money(o.amount_minor)}
                            </span>
                          </div>
                          <p>{o.explanation}</p>
                          {o.blocked && (
                            <p className="blocked-label">
                              Blocked · {o.blocked}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="empty">
                    <span className="orbit">↔</span>
                    <h3>Find common ground.</h3>
                    <p>
                      The buyer protects your budget. The seller proposes a
                      workable scope and price.
                    </p>
                  </div>
                )}
                {a.negotiation_error && (
                  <p className="blocked-label">{a.negotiation_error}</p>
                )}
              </section>
              <aside>
                <div className="section-heading">
                  <h2>The agreement</h2>
                  <span>v{a.version}</span>
                </div>
                <div className="price">
                  {a.amount_minor === null ? "—" : money(a.amount_minor)}
                  <small>Budget {money(a.budget_minor)}</small>
                </div>
                <dl>
                  <dt>Scope</dt>
                  <dd>Landing page · {a.criteria.join(", ")}</dd>
                  <dt>Delivery</dt>
                  <dd>
                    {new Date(a.deadline).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </dd>
                  <dt>Pay to</dt>
                  <dd>{a.seller_email}</dd>
                  <dt>Buyer</dt>
                  <dd>{a.buyer_email}</dd>
                </dl>
                {a.invoice && (
                  <div className="invoice">
                    <span>PayPal sandbox invoice</span>
                    <strong>{a.invoice.status.replaceAll("_", " ")}</strong>
                    <small>{a.invoice.id}</small>
                    <small>
                      Checked{" "}
                      {new Date(a.invoice.checked_at).toLocaleTimeString()}
                    </small>
                  </div>
                )}
                <p className="muted">
                  An invoice is a payment request. Funds are not held or
                  reserved.
                </p>
              </aside>
            </div>
            {a.verification && (
              <details
                className="verification"
                open={a.status === "VERIFIED" || a.status === "NEEDS_REVIEW"}
              >
                <summary>
                  Deliverable review ·{" "}
                  {a.verification.overall === "PASS"
                    ? "checks passed"
                    : "changes needed"}
                </summary>
                <div className="section-heading">
                  <h2>Deliverable review</h2>
                  <span>
                    {a.verification.overall === "PASS"
                      ? "Structural checks passed"
                      : "Changes needed"}
                  </span>
                </div>
                {a.verification.checks.map((c) => (
                  <p key={c.criterion}>
                    <span className={c.passed ? "check" : "fail"}>
                      {c.passed ? "✓" : "×"}
                    </span>
                    <strong>{c.criterion}</strong>
                    <span>{c.evidence}</span>
                  </p>
                ))}
                <small>{a.verification.limitation}</small>
              </details>
            )}
            {["INVOICED", "NEEDS_REVIEW"].includes(a.status) && (
              <section className="evidence" id="evidence-section">
                <h2>Submit the landing page</h2>
                <p>Upload static HTML. It will be inspected, never executed.</p>
                <label>
                  Landing-page HTML
                  <input
                    type="file"
                    accept=".html,.htm,text/html"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 100000) {
                        setError("Use a file under 100 KB.");
                        return;
                      }
                      run(async () =>
                        api(`/agreements/${a.id}/evidence`, {
                          html: await f.text(),
                        }),
                      );
                      e.target.value = "";
                    }}
                  />
                </label>
                {a.status === "NEEDS_REVIEW" && (
                  <>
                    <button
                      className="quiet"
                      onClick={() => setReview(!review)}
                    >
                      Record a human review
                    </button>
                    {review && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          run(() =>
                            api(`/agreements/${a.id}/review`, {
                              accepted: f.get("outcome") === "accept",
                              reason: f.get("reason"),
                            }),
                          );
                        }}
                      >
                        <label>
                          Review decision
                          <select name="outcome">
                            <option value="reject">Request changes</option>
                            <option value="accept">
                              Accept despite failed checks
                            </option>
                          </select>
                        </label>
                        <label>
                          Reason
                          <textarea
                            name="reason"
                            required
                            minLength={10}
                            maxLength={500}
                          />
                        </label>
                        <button disabled={busy}>Save review</button>
                      </form>
                    )}
                  </>
                )}
              </section>
            )}

            <details className="secondary">
              {a.critique && (
                <p role="status">
                  Proposal wording: {a.critique.verdict.replaceAll("_", " ")} ·{" "}
                  {a.critique.explanation} (
                  {a.critique.execution === "live_model"
                    ? "AI advisory review"
                    : a.critique.execution === "unavailable"
                      ? "Review unavailable"
                      : "Deterministic rule check"}
                  ).{" "}
                  {a.critique.verdict !== "CLEAR" &&
                    "Create a revised agreement to resolve these concerns."}
                </p>
              )}
              {a.status === "PROPOSED" && (
                <button
                  className="quiet"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      api(`/agreements/${a.id}/critique`, {
                        mode: a.mode === "live" ? "live" : "rules",
                      }),
                    )
                  }
                >
                  Check proposal wording
                </button>
              )}
              {a.terms_digest && (
                <p>
                  Agreement fingerprint: {a.terms_digest.slice(0, 16)}… ·
                  Detects term changes; does not authenticate a person or
                  establish legal enforceability.
                </p>
              )}

              <summary>Agreement history & details</summary>
              <p>
                {a.mode === "live"
                  ? "Live model inference"
                  : "Deterministic rules; no AI inference"}
                . Accepted terms are locked. Sandbox payments only.
              </p>
              {["DRAFT", "NEGOTIATION_FAILED"].includes(a.status) &&
                a.mode === "deterministic" && (
                  <label>
                    Failure demonstration
                    <select
                      value={scenario}
                      onChange={(e) => setScenario(e.target.value)}
                    >
                      <option value="normal">Normal negotiation</option>
                      <option value="overspend">
                        Attempt above buyer budget
                      </option>
                      <option value="recipient-swap">
                        Attempt recipient substitution
                      </option>
                    </select>
                  </label>
                )}
              <button
                className="quiet"
                onClick={() =>
                  api(`/agreements/${a.id}/audit`)
                    .then(setEvents)
                    .catch((e) => setError(e.message))
                }
              >
                Load audit history
              </button>
              {events.map((e) => (
                <div className="audit-row" key={e.seq}>
                  <time>{new Date(e.timestamp).toLocaleTimeString()}</time>
                  <span>{e.action.replaceAll("_", " ")}</span>
                  <small>{e.next_status}</small>
                </div>
              ))}
              {["DRAFT", "PROPOSED", "NEGOTIATION_FAILED", "ACCEPTED"].includes(
                a.status,
              ) && (
                <button
                  className="quiet danger"
                  disabled={busy}
                  onClick={() => act("cancel")}
                >
                  Cancel agreement
                </button>
              )}
            </details>
          </>
        )}
        <footer>
          <span>Pact · Intent into agreement.</span>
          <span>Sandbox only · MIT licensed</span>
        </footer>
      </main>
    </>
  );
}
