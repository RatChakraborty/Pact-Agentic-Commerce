import { useEffect, useRef, useState } from "react";
import {
  loadReplay,
  visibleOffers,
  type RecordedOffer,
  type ReplayEvidence,
} from "./replay";
import { loadGuided, type GuidedEvidence } from "./guided";
import { DEMO_STAGES, storyStage } from "./demoStory";
import PaymentVerification from "./PaymentVerification";
import { historicalPaymentLifecycle } from "./payments";
import { money } from "./workflow";
import "./demoStory.css";

function Offer({ offer }: { offer: RecordedOffer }) {
  return (
    <li
      className={`story-offer ${offer.role === "buyer" ? "customer-offer" : "business-offer"}`}
    >
      <span className="eyebrow">
        {offer.role === "buyer" ? "Customer agent" : "Business agent"} ·{" "}
        {offer.action}
      </span>
      <strong>{money(offer.amount_minor)}</strong>
      <p>
        {offer.explanation_redacted
          ? "Private strategy omitted. The recorded structured offer is unchanged."
          : offer.explanation}
      </p>
      <small>
        {offer.currency} · {offer.criteria.join(", ")}
      </small>
    </li>
  );
}
export default function Replay() {
  const [data, setData] = useState<ReplayEvidence | null>(null),
    [fixture, setFixture] = useState<GuidedEvidence | null>(null);
  const [stage, setStage] = useState(0),
    [turn, setTurn] = useState(1),
    [retry, setRetry] = useState(0),
    [error, setError] = useState("");
  const [paymentDetails, setPaymentDetails] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const c = new AbortController();
    setError("");
    setData(null);
    setFixture(null);
    Promise.all([loadReplay(c.signal), loadGuided(c.signal)])
      .then(([a, b]) => {
        if (!c.signal.aborted) {
          setData(a);
          setFixture(b);
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [retry]);
  useEffect(() => {
    heading.current?.focus();
    setPaymentDetails(false);
  }, [stage, data]);
  const run = data?.runs.find((r) => r.outcome === "agreement");
  const invalid = data?.runs.find((r) => r.offers.some((o) => o.blocked));
  const blocked = invalid?.offers.find((o) => o.blocked);
  const approved = fixture?.snapshots.find(
    (s) => s.id === "mutual_confirmation",
  )?.agreement;
  const checked = fixture?.snapshots.find(
    (s) => s.id === "verification",
  )?.agreement;
  const reviewed = fixture?.snapshots.find((s) => s.id === "review")?.agreement;
  const step = DEMO_STAGES[stage];
  const ready = Boolean(
    data &&
    fixture &&
    run &&
    invalid &&
    blocked &&
    approved &&
    checked &&
    reviewed,
  );
  function move(next: number) {
    setStage(storyStage(next));
  }
  function restart() {
    setStage(0);
    setTurn(1);
  }
  return (
    <>
      <header>
        <a className="brand" href="/">
          <span className="mark">p</span>Pact
        </a>
        <a href="/try">Try it yourself</a>
      </header>
      <main className="demo-story">
        <p className="eyebrow">
          ONE PROJECT. TWO AGENTS. HUMAN-CONTROLLED PAYMENT.
        </p>
        {!ready && !error && (
          <p role="status">Loading the guided demonstration…</p>
        )}
        {error && (
          <section role="alert">
            <h1>We couldn’t load the recorded evidence.</h1>
            <p>{error}</p>
            <button className="primary" onClick={() => setRetry((n) => n + 1)}>
              Retry evidence loading
            </button>
            <p>
              <a href="/">Back to Pact</a>
            </p>
          </section>
        )}
        {!error && data && fixture && !ready && (
          <section role="alert">
            <p>
              This evidence version is incomplete. Reload the captured records
              to continue.
            </p>
            <button onClick={() => setRetry((n) => n + 1)}>
              Retry evidence loading
            </button>
          </section>
        )}
        {ready &&
          data &&
          fixture &&
          run &&
          invalid &&
          blocked &&
          approved &&
          checked &&
          reviewed && (
            <>
              <nav aria-label="Guided demo progress" className="story-progress">
                <ol>
                  {DEMO_STAGES.map((s, i) => (
                    <li
                      key={s.short}
                      aria-current={stage === i ? "step" : undefined}
                      aria-label={`Stage ${i + 1}: ${s.short}`}
                    >
                      <span>{i + 1}</span>
                      <small>{s.short}</small>
                    </li>
                  ))}
                </ol>
              </nav>
              <p role="status" className="story-position">
                Stage {stage + 1} of 7 · {step.short}
              </p>
              <section
                className="story-stage"
                aria-labelledby="story-title"
                key={stage}
              >
                <span className="story-mode">{step.mode}</span>
                <h1 id="story-title" ref={heading} tabIndex={-1}>
                  {step.title}
                </h1>
                {stage === 0 && (
                  <>
                    <div className="story-participants">
                      <section>
                        <h2>
                          Customer <small>(buyer)</small>
                        </h2>
                        <p>
                          “I need a landing page with hero, features and contact
                          sections. My maximum budget is{" "}
                          {money(run.budget_minor)}.”
                        </p>
                        <span className="status pending">
                          Requests a static HTML deliverable
                        </span>
                      </section>
                      <section>
                        <h2>
                          Business <small>(seller)</small>
                        </h2>
                        <p>
                          “I offer landing-page development. My asking price is{" "}
                          {money(run.asking_minor)}.”
                        </p>
                        <span className="status pending">
                          Publishes the service listing
                        </span>
                      </section>
                    </div>
                    <p className="story-takeaway">
                      The business lists its service; the customer starts a
                      project request. Their agents then negotiate. That is why
                      the business’s price appears first.
                    </p>
                    <p className="muted">
                      A 2–3 minute walkthrough. No account, second browser, API
                      key or payment required.
                    </p>
                  </>
                )}
                {stage === 1 && (
                  <>
                    <p>
                      The public asking price is {money(run.asking_minor)}.
                      These are the actual saved model replies, in their
                      original order—not a new model call.
                    </p>
                    <ol
                      className="story-exchange"
                      aria-label="Recorded negotiation offers"
                    >
                      {visibleOffers(run, turn).map((o, i) => (
                        <Offer key={i} offer={o} />
                      ))}
                    </ol>
                    <p role="status">
                      Offer {turn} of {run.offers.length}
                    </p>
                    {turn === run.offers.length && (
                      <p className="story-takeaway">
                        <strong>
                          Agents reached a {money(run.amount_minor!)} proposal.
                          Human approval is still required.
                        </strong>
                      </p>
                    )}
                    <div className="story-secondary">
                      <button
                        disabled={turn <= 1}
                        onClick={() => setTurn((n) => n - 1)}
                      >
                        Previous offer
                      </button>
                      <button onClick={() => setTurn(run.offers.length)}>
                        Show full exchange
                      </button>
                      <button onClick={() => setTurn(1)}>
                        Restart offer replay
                      </button>
                    </div>
                  </>
                )}
                {stage === 2 && (
                  <>
                    <p>
                      An AI agent can generate an offer outside its authorized
                      limits. Pact independently checks it. This separate
                      recorded infeasible test uses different limits from the
                      first example.
                    </p>
                    <h2>Model output: a proposed action</h2>
                    <ol className="story-exchange">
                      <Offer offer={blocked} />
                    </ol>
                    <section
                      className="story-rejection"
                      aria-label="Actual host decision"
                    >
                      <span className="eyebrow">HOST DECISION · REJECTED</span>
                      <h2>{blocked.blocked}</h2>
                      <p>
                        No agreement or payment was authorized by this rejected
                        proposal.
                      </p>
                    </section>
                    <details>
                      <summary>
                        Inspect the complete infeasible exchange
                      </summary>
                      <p>
                        Customer cap {money(invalid.budget_minor)} · business
                        asking {money(invalid.asking_minor)}.
                      </p>
                      <ol className="story-exchange">
                        {invalid.offers.map((o, i) => (
                          <Offer key={i} offer={o} />
                        ))}
                      </ol>
                    </details>
                  </>
                )}
                {stage === 3 && (
                  <>
                    <p className="story-transition">
                      We now switch to a separate captured backend workflow.
                      These are recorded fixture confirmations—not new approvals
                      by you, and not the contract produced by the real AI
                      replay.
                    </p>
                    <ol className="story-milestones">
                      <li>
                        Customer requested the landing page and authorized its
                        agent.
                      </li>
                      <li>Business authorized its own agent.</li>
                      <li>
                        Deterministic agents proposed the shared terms below.
                      </li>
                    </ol>
                    <section
                      className="story-contract"
                      aria-label="Captured agreement terms"
                    >
                      <h2>
                        {money(approved.amount_minor!)} · {approved.currency} ·
                        Version {approved.version}
                      </h2>
                      <p>{approved.objective}</p>
                      <p>Static HTML · {approved.criteria.join(", ")}.</p>
                      <div className="story-confirmations">
                        <p>
                          {approved.approvals.includes("buyer")
                            ? "✓ Customer confirmation captured"
                            : "Customer confirmation not recorded"}
                        </p>
                        <p>
                          {approved.approvals.includes("seller")
                            ? "✓ Business confirmation captured"
                            : "Business confirmation not recorded"}
                        </p>
                      </div>
                      <p>
                        Both approved the same version and fingerprint. If
                        important terms change, the old approval cannot silently
                        authorize a new version.
                      </p>
                      <p className="muted">
                        No invoice or payment was created for this fixture.
                      </p>
                    </section>
                    <details>
                      <summary>
                        Inspect fingerprint and captured authorization
                        rejections
                      </summary>
                      <code className="digest">{approved.terms_digest}</code>
                      <ul>
                        {Object.entries(fixture.rejected_requests).map(
                          ([k, v]) => (
                            <li key={k}>
                              {k.replaceAll("_", " ")} · captured HTTP {v}
                            </li>
                          ),
                        )}
                      </ul>
                      <a
                        href="/assets/pact-guided-v1.json"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Sanitized backend fixture
                      </a>
                    </details>
                    <details>
                      <summary>Optional: semantic critique evidence</summary>
                      <p>{data.critique.scope}</p>
                      <p>
                        Contradictions flagged{" "}
                        {
                          data.critique.metrics.contradiction_detection
                            .numerator
                        }
                        /
                        {
                          data.critique.metrics.contradiction_detection
                            .denominator
                        }
                        ; legitimate proposals passed{" "}
                        {
                          data.critique.metrics.valid_proposal_pass_rate
                            .numerator
                        }
                        /
                        {
                          data.critique.metrics.valid_proposal_pass_rate
                            .denominator
                        }
                        . {data.critique.successful_model_calls} successful
                        reviews across {data.critique.attempted_model_calls}{" "}
                        attempts.
                      </p>
                      <p>
                        {data.critique.limitation} The critic advises;
                        deterministic authorization remains authoritative.
                      </p>
                    </details>
                  </>
                )}
                {stage === 4 && (
                  <>
                    <p>
                      The business submitted HTML. Pact checked its structure,
                      then recorded the customer’s separate review in this
                      captured fixture.
                    </p>
                    <section aria-label="Captured structural verification">
                      <h2>Required sections</h2>
                      <ul className="story-checks">
                        {checked.verification?.checks
                          .filter((c) =>
                            approved.criteria.includes(c.criterion),
                          )
                          .map((c) => (
                            <li key={c.criterion}>
                              <strong>
                                {c.passed ? "PASS" : "FAIL"} · {c.criterion}
                              </strong>
                              <span>{c.evidence}</span>
                            </li>
                          ))}
                      </ul>
                    </section>

                    <section
                      className="story-contract"
                      aria-label="Captured customer review"
                    >
                      <h2>
                        Customer review:{" "}
                        {reviewed.human_review?.accepted
                          ? "accepted"
                          : "changes requested"}
                      </h2>
                      <p>
                        The fixture customer reviewed the structural evidence.
                        Automatic checks do not guarantee design quality.
                      </p>
                      <p>No payment was authorized by this review.</p>
                    </section>
                    <details>
                      <summary>Additional structural checks and limits</summary>
                      <ul>
                        {checked.verification?.checks
                          .filter(
                            (c) => !approved.criteria.includes(c.criterion),
                          )
                          .map((c) => (
                            <li key={c.criterion}>
                              {c.passed ? "PASS" : "FAIL"} · {c.criterion}:{" "}
                              {c.evidence}
                            </li>
                          ))}
                      </ul>
                      <p>{checked.verification?.limitation}</p>
                    </details>
                  </>
                )}
                {stage === 5 && (
                  <>
                    <p className="story-transition">
                      This is authentic PayPal sandbox evidence from a{" "}
                      <strong>different completed agreement</strong>. It did not
                      pay for the AI replay or captured fixture. You will not
                      make a payment.
                    </p>
                    <section
                      className="payment-verification story-payment-summary"
                      aria-label="Historical payment summary"
                    >
                      <span className="provider-label">
                        PayPal Sandbox Integration
                      </span>
                      <p className="payment-paid">
                        <strong>
                          Provider-confirmed {data.payment.status}
                        </strong>
                      </p>
                      <h2>
                        {data.payment.currency} {data.payment.received} received
                      </h2>
                      <p>
                        {data.payment.due} remaining due · PayPal-reported date{" "}
                        {data.payment.payment_date}
                      </p>
                      <p>
                        Original invoice <code>{data.payment.invoice_id}</code>
                      </p>
                      <ol
                        className="payment-stage-strip"
                        aria-label="Original historical payment lifecycle"
                      >
                        {historicalPaymentLifecycle(data.payment).map((s) => (
                          <li key={s.label} data-confirmed={s.confirmed}>
                            {s.confirmed ? "✓" : "○"} {s.label}
                          </li>
                        ))}
                      </ol>
                      <p className="muted">
                        The original workflow recorded buyer authorization. A
                        separate seller human confirmation was not captured.
                        This is a dated receipt, not a new provider query.
                      </p>
                    </section>
                    <details
                      onToggle={(e) => setPaymentDetails(e.currentTarget.open)}
                    >
                      <summary>
                        Inspect original invoice, checkout flow and provider
                        readback
                      </summary>
                      {paymentDetails && (
                        <PaymentVerification evidence={data} />
                      )}
                    </details>
                  </>
                )}
                {stage === 6 && (
                  <>
                    <p>
                      Each important decision can be inspected. These are
                      separate evidence sources, not one combined transaction.
                    </p>
                    <div className="story-audit">
                      <section>
                        <h2>Recorded real AI</h2>
                        <p>
                          Three offers reached a {money(run.amount_minor!)}{" "}
                          proposal. The separate infeasible test was
                          host-rejected: {blocked.blocked}
                        </p>
                      </section>
                      <section>
                        <h2>Captured backend demonstration</h2>
                        <p>
                          Version {reviewed.version}: both confirmations,
                          structural checks and customer review. No payment.
                        </p>
                        <details>
                          <summary>Captured agreement audit</summary>
                          <ol className="payment-timeline">
                            {reviewed.history.map((e, i) => (
                              <li key={i}>
                                <span>
                                  {e.role === "buyer"
                                    ? "Customer"
                                    : e.role === "seller"
                                      ? "Business"
                                      : e.role}{" "}
                                  · {e.action.replaceAll("_", " ")}
                                </span>
                                <small>{e.status}</small>
                              </li>
                            ))}
                          </ol>
                        </details>
                      </section>
                      <section>
                        <h2>Historical PayPal evidence</h2>
                        <p>
                          {data.payment.currency} {data.payment.received}{" "}
                          received · {data.payment.status} · {data.payment.due}{" "}
                          due.
                        </p>
                        <p>
                          Reconciled against original invoice{" "}
                          <code>{data.payment.invoice_id}</code>, checked{" "}
                          {new Date(data.payment.checked_at).toLocaleString(
                            undefined,
                            { timeZoneName: "short" },
                          )}
                          .
                        </p>
                      </section>
                    </div>
                    <h2>Agents negotiate. People decide.</h2>
                    <p>
                      Pact is an early implementation of trustworthy
                      agent-mediated commerce: agents negotiate, while trusted
                      authorization and human consent govern commitments and
                      financial operations.
                    </p>
                    <p className="muted">
                      The advanced marketplace uses two independent browser
                      contexts for independent participants. This walkthrough
                      does not require them.
                    </p>
                  </>
                )}
                <details className="story-provenance">
                  <summary>Technical evidence and provenance</summary>
                  <p>
                    Genuine model evidence: {run.model}, recorded{" "}
                    {new Date(data.recorded_at).toLocaleString(undefined, {
                      timeZoneName: "short",
                    })}
                    . Token usage and cost estimates are historical, not billing
                    receipts or new inference.
                  </p>
                  <ul>
                    {data.provenance.map((p) => (
                      <li key={p.path}>
                        <a
                          href={`https://github.com/RatChakraborty/Pact-Agentic-Commerce/blob/${p.commit}/${p.path}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {p.path}
                        </a>
                        <code className="digest">SHA-256 {p.sha256}</code>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="/assets/pact-guided-v1.json"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Captured backend fixture JSON
                  </a>
                </details>
              </section>
              <footer className="story-actions">
                <button disabled={stage === 0} onClick={() => move(stage - 1)}>
                  Back
                </button>
                <button onClick={restart}>Restart guided demo</button>
                {stage === 6 ? (
                  <a className="primary" href="/try">
                    Try the interactive marketplace
                  </a>
                ) : (
                  <button
                    className="primary"
                    onClick={() =>
                      stage === 1 && turn < run.offers.length
                        ? setTurn((n) => n + 1)
                        : move(stage + 1)
                    }
                  >
                    {stage === 1 && turn < run.offers.length
                      ? "Next offer →"
                      : step.next}
                  </button>
                )}
              </footer>
            </>
          )}
      </main>
    </>
  );
}
