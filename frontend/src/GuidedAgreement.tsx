import { useEffect, useState } from "react";
import { guidedStep, loadGuided, type GuidedEvidence } from "./guided";
import { money } from "./workflow";
import "./guided.css";

export default function GuidedAgreement() {
  const [data, setData] = useState<GuidedEvidence | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(() => {
    try {
      return Number(sessionStorage.getItem("pact-guided-v1-step") || 0);
    } catch {
      return 0;
    }
  });
  useEffect(() => {
    const c = new AbortController();
    loadGuided(c.signal)
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem("pact-guided-v1-step", String(step));
    } catch {
      /* Display controls need no storage permission. */
    }
  }, [step]);
  const position = guidedStep(step, data?.snapshots.length || 1);
  const snapshot = data?.snapshots[position];
  const a = snapshot?.agreement;
  return (
    <section
      id="agreement-demo"
      className="guided-agreement"
      aria-labelledby="guided-title"
    >
      <span className="eyebrow">Interactive deterministic demonstration</span>
      <h2 id="guided-title">From a proposal to a shared commitment.</h2>
      <p>
        This separate backend fixture shows both human perspectives in one
        browser. It is not the recorded real AI negotiation above or the
        historical PayPal payment below.
      </p>
      <p className="muted">
        Controls reveal captured fixture states. They do not authorize a real
        agreement, perform verification, or create a payment.
      </p>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading captured agreement…</p>}
      {data && a && snapshot && (
        <>
          <div className="guided-perspectives">
            <div>
              <span className="eyebrow">CUSTOMER REQUEST</span>
              <p>{a.objective}</p>
              <small>
                Authorizes a bounded buyer agent. Human term approval remains
                separate.
              </small>
            </div>
            <div>
              <span className="eyebrow">BUSINESS SERVICE</span>
              <p>
                {data.service.title} · asking {money(data.service.asking_minor)}
              </p>
              <small>
                Authorizes its own seller agent. Private economic limits are
                omitted from this projection.
              </small>
            </div>
          </div>
          <nav
            className="replay-controls"
            aria-label="Guided agreement controls"
          >
            <button
              disabled={position === 0}
              onClick={() => setStep(position - 1)}
            >
              Previous agreement step
            </button>
            <button
              className="primary"
              disabled={position === data.snapshots.length - 1}
              onClick={() => setStep(position + 1)}
            >
              Next agreement step
            </button>
            <button onClick={() => setStep(0)}>
              Restart agreement example
            </button>
            <button onClick={() => setStep(data.snapshots.length - 1)}>
              View captured completed agreement
            </button>
          </nav>
          <p role="status">
            Captured step {position + 1} of {data.snapshots.length} ·{" "}
            {snapshot.label}
          </p>
          <ol className="guided-stages" aria-label="Captured agreement stages">
            {data.snapshots.map((s, i) => (
              <li
                key={s.id}
                aria-current={position === i ? "step" : undefined}
                className={position === i ? "current" : ""}
              >
                {s.label}
              </li>
            ))}
          </ol>
          <section className="objective" aria-label="Captured fixture contract">
            <div>
              <h3>
                Version {a.version} · {a.status.replaceAll("_", " ")}
              </h3>
              <dl className="payment-facts">
                <div>
                  <dt>Proposed amount</dt>
                  <dd>
                    {a.amount_minor === null
                      ? "Not proposed"
                      : money(a.amount_minor)}{" "}
                    · {a.currency}
                  </dd>
                </div>
                <div>
                  <dt>Approved amount</dt>
                  <dd>
                    {a.approvals.length === 2
                      ? money(a.amount_minor!)
                      : "Both captured confirmations required"}
                  </dd>
                </div>
                <div>
                  <dt>Human confirmations in this fixture</dt>
                  <dd>
                    {a.approvals.length}/2 ·{" "}
                    {a.approvals.join(" and ") || "none"}
                  </dd>
                </div>
                <div>
                  <dt>Scope / deadline</dt>
                  <dd>
                    {a.criteria.join(", ")} ·{" "}
                    {new Date(a.deadline).toLocaleString(undefined, {
                      timeZoneName: "short",
                    })}
                  </dd>
                </div>
                <div>
                  <dt>Real invoice / payment</dt>
                  <dd>Not created · {data.payment_status}</dd>
                </div>
                <div>
                  <dt>Captured wording check</dt>
                  <dd>
                    {a.critique
                      ? `${a.critique.verdict} · deterministic rules`
                      : "Not run at this captured step"}
                  </dd>
                </div>
              </dl>
              <p>
                Agreement fingerprint:{" "}
                <code className="digest">
                  {a.terms_digest || "Not proposed yet"}
                </code>
              </p>
              <p className="muted">
                The same version and fingerprint are required from each party. A
                digest detects changes; it does not authenticate a person or
                establish legal enforceability.
              </p>
            </div>
          </section>
          {a.verification && (
            <section aria-label="Captured milestone verification">
              <h3>Recorded structural checks · {a.verification.overall}</h3>
              <ul>
                {a.verification.checks.map((c) => (
                  <li key={c.criterion}>
                    {c.passed ? "PASS" : "FAIL"} · {c.criterion}: {c.evidence}
                  </li>
                ))}
              </ul>
              <p>{a.verification.limitation}</p>
            </section>
          )}
          {a.human_review && (
            <p className="payment-boundary">
              <strong>
                Captured customer review:{" "}
                {a.human_review.accepted ? "accepted" : "changes requested"}.
              </strong>{" "}
              {a.human_review.reason} This completes the fixture only; no
              invoice or payment exists.
            </p>
          )}
          <details>
            <summary>
              Inspect rejected requests and authorization boundaries
            </summary>
            <ul>
              {Object.entries(data.rejected_requests).map(([name, status]) => (
                <li key={name}>
                  {name.replaceAll("_", " ")} · actual fixture HTTP {status}
                </li>
              ))}
            </ul>
            <p>
              These are captured backend rejections, separate from the genuine
              model policy rejection in the negotiation chapter.
            </p>
          </details>
          <details>
            <summary>Captured agreement audit and provenance</summary>
            <ol className="payment-timeline">
              {a.history.map((e, i) => (
                <li key={i}>
                  <time>
                    {new Date(e.at).toLocaleString(undefined, {
                      timeZoneName: "short",
                    })}
                  </time>
                  <span>
                    {e.role} · {e.action.replaceAll("_", " ")}
                  </span>
                  <code>{e.status}</code>
                </li>
              ))}
            </ol>
            <p>
              Backend fixture recorded{" "}
              {new Date(data.recorded_at).toLocaleString(undefined, {
                timeZoneName: "short",
              })}{" "}
              from source{" "}
              <code className="digest">{data.backend_source_commit}</code>.
            </p>
            <p>
              Generator SHA-256{" "}
              <code className="digest">{data.generator_sha256}</code>
            </p>
            <a
              href="/assets/pact-guided-v1.json"
              target="_blank"
              rel="noreferrer"
            >
              Inspect sanitized fixture responses
            </a>
            {data.limitations.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </details>
          <a className="text-link" href="#payment-proof">
            Continue to the separate verified PayPal transaction →
          </a>
        </>
      )}
    </section>
  );
}
