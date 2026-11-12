import { useEffect, useState } from "react";
import { loadReplay, visibleOffers, type ReplayEvidence } from "./replay";
import Progress from "./Progress";
import { money } from "./workflow";
export default function Replay() {
  const [data, setData] = useState<ReplayEvidence | null>(null),
    [error, setError] = useState(""),
    [index, setIndex] = useState(0),
    [step, setStep] = useState(1);
  useEffect(() => {
    const c = new AbortController();
    loadReplay(c.signal)
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, []);
  const run = data?.runs[index];
  return (
    <>
      <header>
        <a className="brand" href="/">
          <span className="mark">p</span>Pact
        </a>
        <a href="/try">Try it yourself →</a>
      </header>
      <main>
        <span className="eyebrow">
          RECORDED GENUINE AI · NO NEW INFERENCE OR PAYMENTS
        </span>
        <h1>Agents negotiate. People decide.</h1>
        <p>
          Inspect actual model replies and host decisions from recorded tests.
          Replay controls reveal existing evidence; they do not stream a new
          negotiation.
        </p>
        {error && <p role="alert">{error}</p>}
        {!data && !error && <p role="status">Loading recorded evidence…</p>}
        {run && data && (
          <>
            <label>
              Recorded scenario
              <select
                value={index}
                onChange={(e) => {
                  setIndex(Number(e.target.value));
                  setStep(1);
                }}
              >
                {data.runs.map((r, i) => (
                  <option key={r.id} value={i}>
                    {r.outcome === "agreement"
                      ? "Feasible negotiation · $300 agreement"
                      : "Infeasible negotiation · host block"}
                  </option>
                ))}
              </select>
            </label>
            <Progress
              status={
                step === run.offers.length
                  ? run.outcome === "agreement"
                    ? "PROPOSED"
                    : "NEGOTIATION_FAILED"
                  : "NEGOTIATING"
              }
              demo
            />
            <section className="objective">
              <div>
                <span className="eyebrow">RECORDED PROJECT BRIEF</span>
                <h2>{run.objective}</h2>
                <p>
                  Buyer cap {money(run.budget_minor)} · Seller asking{" "}
                  {money(run.asking_minor)} · USD
                </p>
                <p>
                  Required sections: {run.criteria.join(", ")}. Contract
                  approval remains a human decision.
                </p>
              </div>
              <span
                className={`status ${step === run.offers.length && run.outcome !== "agreement" ? "blocked" : "pending"}`}
              >
                {step === run.offers.length
                  ? run.outcome === "agreement"
                    ? "Proposal reached"
                    : "Host rejected offer"
                  : "Inspecting offers"}
              </span>
            </section>
            <nav
              className="replay-controls"
              aria-label="Recorded replay controls"
            >
              <button
                disabled={step <= 0}
                onClick={() => setStep((s) => s - 1)}
              >
                Previous
              </button>
              <button
                className="primary"
                disabled={step >= run.offers.length}
                onClick={() => setStep((s) => s + 1)}
              >
                Next
              </button>
              <button onClick={() => setStep(0)}>Restart</button>
              <button onClick={() => setStep(run.offers.length)}>
                Show complete transcript
              </button>
              <span role="status">
                Offer {step} of {run.offers.length}
              </span>
            </nav>
            <section className="negotiation">
              <h2>The recorded negotiation</h2>
              <ol className="timeline">
                {visibleOffers(run, step).map((o, i) => (
                  <li key={i} className={o.blocked ? "offer-blocked" : ""}>
                    <div className="avatar">
                      {o.role === "buyer" ? "B" : "S"}
                    </div>
                    <div>
                      <strong>
                        {o.role === "buyer" ? "Buyer agent" : "Seller agent"} ·{" "}
                        {o.action} · {money(o.amount_minor)}
                      </strong>
                      <p>{o.explanation}</p>
                      <small>
                        {o.currency} · {o.criteria.join(", ")}
                      </small>
                      {o.blocked && (
                        <p className="blocked-label">
                          Host blocked · {o.blocked}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              {step === 0 && (
                <p>Start with Next to inspect the first genuine model offer.</p>
              )}
            </section>
            {step === run.offers.length && (
              <section className="next">
                <div>
                  <h2>
                    {run.outcome === "agreement"
                      ? `${money(run.amount_minor!)} proposed — human approval still required`
                      : "No agreement authorized"}
                  </h2>
                  <p>
                    {run.reason ||
                      "The agents agreed on a proposed price. That is not a human contractual confirmation or financial authorization."}
                  </p>
                  <p>{data.approval_boundary}</p>
                </div>
              </section>
            )}
            <details className="secondary">
              <summary>What’s real in this demo?</summary>
              <p>
                These are frozen replies from {run.model}, recorded{" "}
                {new Date(data.recorded_at).toLocaleString(undefined, {
                  timeZoneName: "short",
                })}
                . Fixture inputs and outcomes are preserved, including model
                failures. No credentials or database are required to replay
                them.
              </p>
              <p>
                Usage: {run.prompt_tokens} input / {run.completion_tokens}{" "}
                output tokens. Configured cost estimate $
                {run.estimated_usd.toFixed(6)}; not a billing receipt.
              </p>
              {data.limitations.map((t) => (
                <p key={t}>{t}</p>
              ))}
              <p>
                Evidence version: <code>{data.evidence_version}</code>
              </p>
              {data.provenance.map((p) => (
                <p key={p.path}>
                  <a
                    href={`https://github.com/RatChakraborty/Pact-Agentic-Commerce/blob/${p.commit}/${p.path}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {p.path} ↗
                  </a>
                  <br />
                  <code className="digest">SHA-256 {p.sha256}</code>
                </p>
              ))}
            </details>
            <details className="secondary">
              <summary>
                Separate verified PayPal sandbox evidence ·{" "}
                {data.payment.status}
              </summary>
              <p>{data.payment.attribution}</p>
              <p>
                Provider readback: {data.payment.status} ·{" "}
                {data.payment.currency} {data.payment.amount} received ·{" "}
                {data.payment.due} due.
              </p>
              <p>
                Invoice <code>{data.payment.invoice_id}</code>
                <br />
                Payment <code>{data.payment.payment_id}</code>
                <br />
                Checked{" "}
                {new Date(data.payment.checked_at).toLocaleString(undefined, {
                  timeZoneName: "short",
                })}
                .
              </p>
              <p>
                This is a dated recorded receipt, not a fresh provider query or
                a payment for this replay.
              </p>
            </details>
            <details className="secondary">
              <summary>Separate semantic critique evidence & limits</summary>
              <p>{data.critique.scope}</p>
              <p>
                Contradictions flagged:{" "}
                {data.critique.metrics.contradiction_detection.numerator}/
                {data.critique.metrics.contradiction_detection.denominator}.
                Legitimate proposals passed:{" "}
                {data.critique.metrics.valid_proposal_pass_rate.numerator}/
                {data.critique.metrics.valid_proposal_pass_rate.denominator}.{" "}
                {data.critique.successful_model_calls} successful model reviews
                across {data.critique.attempted_model_calls} attempts.
              </p>
              <p>
                {data.critique.limitation} The critic advises; deterministic
                rules enforce.
              </p>
            </details>
          </>
        )}
        <footer>
          <a href="/try">Try it yourself →</a>
          <span>Recorded evidence · no new contract</span>
        </footer>
      </main>
    </>
  );
}
