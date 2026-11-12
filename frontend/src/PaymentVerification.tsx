import { useEffect, useState } from "react";
import { loadReplay, type ReplayEvidence } from "./replay";
import {
  agreementPaymentFacts,
  paymentLifecycle,
  historicalPaymentLifecycle,
  safeSandboxCheckout,
  type PaymentAgreement,
} from "./payments";
import { money } from "./workflow";
import "./payment.css";
import PayPalIntegration from "./PayPalIntegration";

export default function PaymentVerification({
  agreement,
  evidence,
}: {
  agreement?: PaymentAgreement;
  evidence?: ReplayEvidence;
}) {
  const [data, setData] = useState<ReplayEvidence | null>(evidence || null),
    [error, setError] = useState("");
  useEffect(() => {
    if (evidence) {
      setData(evidence);
      return;
    }
    const c = new AbortController();
    loadReplay(c.signal)
      .then(setData)
      .catch(() => {
        if (!c.signal.aborted)
          setError(
            "Recorded PayPal evidence could not be loaded. Please reload this page.",
          );
      });
    return () => c.abort();
  }, [evidence]);
  const facts = agreement ? agreementPaymentFacts(agreement) : null;
  return (
    <section
      className="payment-verification"
      id="payment-proof"
      aria-labelledby="payment-title"
    >
      <div className="payment-heading">
        <span className="eyebrow">
          {agreement
            ? "This agreement · payment status"
            : "Recorded provider evidence"}
        </span>
        <span className="provider-label">PayPal Sandbox Integration</span>
      </div>
      <h2 id="payment-title">Payment verification</h2>
      <p>
        Agree on the work. Review the evidence. Authorize the handoff.
        PayPal—not an agent—reports whether its invoice is paid.
      </p>
      {facts && agreement && (
        <section
          className="current-payment"
          aria-label="This agreement payment state"
        >
          <h3>This agreement</h3>
          <ol
            className="payment-stage-strip"
            aria-label="This agreement payment lifecycle"
          >
            {paymentLifecycle(agreement).map((stage) => (
              <li
                key={stage.label}
                data-confirmed={stage.confirmed}
                aria-label={`${stage.label}: ${stage.confirmed ? "confirmed" : "not confirmed"}`}
              >
                {stage.confirmed ? "✓" : "○"} {stage.label}
              </li>
            ))}
          </ol>
          <dl className="payment-facts">
            <div>
              <dt>Negotiated amount</dt>
              <dd>
                {agreement.amount_minor == null
                  ? "No price agreed"
                  : money(agreement.amount_minor)}
              </dd>
            </div>
            <div>
              <dt>Approved amount / currency</dt>
              <dd>
                {(facts.shared
                  ? agreement.approvals?.includes("buyer") &&
                    agreement.approvals?.includes("seller")
                  : agreement.accepted_at) && agreement.amount_minor != null
                  ? `${money(agreement.amount_minor)} · ${agreement.currency || "USD"}`
                  : "Approval pending"}
              </dd>
            </div>
            <div>
              <dt>Payment recipient</dt>
              <dd>
                {agreement.seller_email ||
                  "No PayPal recipient configured for this demo"}
              </dd>
            </div>
            <div>
              <dt>Human terms approval</dt>
              <dd>{facts.terms}</dd>
            </div>
            <div>
              <dt>Milestone checks</dt>
              <dd>{facts.milestone}</dd>
            </div>
            <div>
              <dt>Human review / authorization</dt>
              <dd>{facts.review}</dd>
            </div>
            <div>
              <dt>Real PayPal invoice</dt>
              <dd>{facts.invoice}</dd>
            </div>
            <div>
              <dt>Recorded provider status</dt>
              <dd className={facts.paid ? "payment-paid" : ""}>
                {facts.provider === "NOT_CREATED"
                  ? "Not checked — no invoice exists"
                  : facts.provider}
              </dd>
            </div>
          </dl>
          {agreement.invoice?.checked_at && (
            <p>
              Last provider reconciliation:{" "}
              {new Date(agreement.invoice.checked_at).toLocaleString(
                undefined,
                { timeZoneName: "short" },
              )}
              . This is recorded state; this panel makes no provider request.
            </p>
          )}
          {safeSandboxCheckout(agreement) && (
            <a
              className="text-link provider-checkout"
              href={safeSandboxCheckout(agreement)!}
              target="_blank"
              rel="noreferrer"
            >
              {facts.paid
                ? "View PayPal sandbox invoice"
                : "Open authorized PayPal sandbox checkout"}{" "}
              →
            </a>
          )}
          {facts.shared && (
            <p className="payment-boundary">
              <strong>
                No invoice or payment was created for this demo agreement.
              </strong>{" "}
              Both confirmations and successful evidence review remain separate
              from financial authorization. The receipt below belongs to a
              different, previously verified contract.
            </p>
          )}
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      {!data && !error && (
        <p role="status">Loading recorded payment evidence…</p>
      )}
      {data && (
        <details className="historical-proof-disclosure" open={!agreement}>
          <summary>
            Separate historical PayPal proof · {data.payment.status}
          </summary>
          <section
            className="historical-payment"
            aria-label="Separate historical PayPal evidence"
          >
            <div className="payment-record-label">
              <span>
                Different agreement · previously verified sandbox payment
              </span>
              <strong className="payment-paid">
                Provider-confirmed {data.payment.status}
              </strong>
            </div>
            <ol
              className="payment-stage-strip"
              aria-label="Original historical payment lifecycle"
            >
              {historicalPaymentLifecycle(data.payment).map((stage) => (
                <li
                  key={stage.label}
                  data-confirmed={stage.confirmed}
                  aria-label={`${stage.label}: ${stage.confirmed ? "confirmed" : "not confirmed"}`}
                >
                  {stage.confirmed ? "✓" : "○"} {stage.label}
                </li>
              ))}
            </ol>
            <h3>
              {data.payment.currency} {data.payment.amount} received{" "}
              <small>· {data.payment.due} remaining due</small>
            </h3>
            <p>
              {data.payment.attribution} This is a dated receipt, not a new
              provider query.
            </p>
            <dl className="payment-facts">
              <div>
                <dt>Original accepted contract amount</dt>
                <dd>{money(data.payment.contract.accepted_amount_minor)}</dd>
              </div>
              <div>
                <dt>Original agreement version</dt>
                <dd>v{data.payment.contract.agreement_version}</dd>
              </div>
              <div>
                <dt>Invoice identifier</dt>
                <dd>
                  <code>{data.payment.invoice_id}</code>
                </dd>
              </div>
              <div>
                <dt>Created / sent evidence</dt>
                <dd>
                  Creation is in the original Pact audit. Draft sending is an
                  implemented adapter operation; this receipt does not include a
                  separate send response.
                </dd>
              </div>
              <div>
                <dt>Provider payment identifier</dt>
                <dd>
                  <code>{data.payment.payment_id}</code>
                </dd>
              </div>
              <div>
                <dt>PayPal-reported payment date</dt>
                <dd>
                  {data.payment.payment_date} · {data.payment.currency}{" "}
                  {data.payment.received} received
                </dd>
              </div>
              <div>
                <dt>Provider readback</dt>
                <dd>
                  {new Date(data.payment.checked_at).toLocaleString(undefined, {
                    timeZoneName: "short",
                  })}
                </dd>
              </div>
            </dl>
            <details>
              <summary>Inspect original contract and payment timeline</summary>
              <p>{data.payment.contract.authorization_scope}</p>
              <ol className="payment-timeline">
                {data.payment.contract.events.map((e, i) => (
                  <li key={i}>
                    <time>
                      {new Date(e.timestamp).toLocaleString(undefined, {
                        timeZoneName: "short",
                      })}
                    </time>
                    <span>{e.action.replaceAll("_", " ")}</span>
                    <code>{e.next_status}</code>
                  </li>
                ))}
              </ol>
              <p>
                The preserved implementation creates the invoice after buyer
                term approval, before milestone verification. A draft is sent
                during buyer-authorized handoff when needed. Checkout is
                completed on the actual PayPal sandbox page. The two-persona
                demo does not perform those provider actions.
              </p>
            </details>
            <PayPalIntegration invoiceId={data.payment.invoice_id} />
          </section>
        </details>
      )}
      <p className="payment-operator-note">
        Live sandbox actions belong to the authenticated operator workflow.
        Public visitors and demo personas cannot create invoices, trigger paid
        inference, or authorize provider writes. The shared demo's real-payment
        adapter remains deferred.
      </p>
    </section>
  );
}
export function PaymentPage() {
  return (
    <>
      <header>
        <a className="brand" href="/">
          <span className="mark">p</span>Pact
        </a>
        <a href="/demo">Explore recorded AI →</a>
      </header>
      <main>
        <span className="eyebrow">PAYPAL INVOICING & PAYMENT EVIDENCE</span>
        <h1>
          Know what was agreed.
          <br />
          Verify what was paid.
        </h1>
        <PaymentVerification />
        <footer>
          <a href="/try">Try a customer/business agreement →</a>
          <a href="/demo">Inspect genuine AI negotiation →</a>
        </footer>
      </main>
    </>
  );
}
