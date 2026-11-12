/** Read-only explanation of the existing adapter; never invokes a provider. */
export default function PayPalIntegration({
  invoiceId,
}: {
  invoiceId: string;
}) {
  return (
    <details className="paypal-integration">
      <summary>How Pact integrates PayPal</summary>
      <p>
        Pact controls authorization. PayPal creates invoices, hosts sandbox
        checkout and reports payment state. This viewer makes no provider calls.
      </p>
      <ol
        className="payment-timeline"
        aria-label="Original transaction sequence"
      >
        <li>Original buyer accepted the contractual terms.</li>
        <li>Pact created an invoice through PayPal’s Invoicing API.</li>
        <li>Pact associated the invoice ID with the accepted agreement.</li>
        <li>The buyer explicitly authorized the checkout handoff.</li>
        <li>The buyer completed checkout on PayPal’s hosted sandbox page.</li>
        <li>Pact retrieved the invoice’s provider-reported payment state.</li>
        <li>Pact reconciled the original agreement to PAID.</li>
      </ol>
      <p>
        That sequence belongs only to the saved historical transaction. The
        original audit records buyer consent, not a separate seller human
        confirmation. It does not pay for the recorded AI run or captured
        two-person agreement.
      </p>
      <h3>Existing server-side operations</h3>
      <ul>
        <li>
          <code>POST /v1/oauth2/token</code>: server-side OAuth; credentials
          never reach the browser.
        </li>
        <li>
          <code>POST /v2/invoicing/invoices</code>: create with a durable{" "}
          <code>PayPal-Request-Id</code>.
        </li>
        <li>
          <code>POST /v2/invoicing/search-invoices</code>: recover an
          interrupted creation by the agreement-derived invoice number.
        </li>
        <li>
          <code>POST /v2/invoicing/invoices/&#123;invoice_id&#125;/send</code>:
          send a draft during authorized handoff when needed.
        </li>
        <li>
          <code>GET /v2/invoicing/invoices/&#123;invoice_id&#125;</code>: read
          back and reconcile the same invoice.
        </li>
      </ul>
      <p>Saved invoice readback endpoint (not called by this viewer):</p>
      <code className="payment-endpoint">
        GET /v2/invoicing/invoices/{invoiceId}
      </code>
      <h3>Integrity before reconciliation</h3>
      <p>
        The adapter checks the accepted agreement binding, invoice ID, amount,
        currency, merchant and buyer. Checkout links must use HTTPS and an
        allowed PayPal sandbox hostname, with buyer handoff authorization.
        Invoice creation, a checkout link or a return URL never proves payment.
        Provider-confirmed payment state is required; no escrow or automatic
        release is implemented.
      </p>
      <p>
        Implementation support and mocked contract tests cover these operations.
        The saved provider receipt and original agreement audit substantiate
        this separate $300 USD PAID transaction. They do not contain a separate
        response for every supported operation or expose recipient identities,
        so this viewer does not invent positive checks for undisclosed fields.
        Public provider writes and paid inference remain disabled.
      </p>
      <a
        href="https://developer.paypal.com/docs/api/invoicing/v2/"
        target="_blank"
        rel="noreferrer"
      >
        Official PayPal Invoicing API documentation →
      </a>
      <p>
        <a
          href="https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/invoicing_v2.json"
          target="_blank"
          rel="noreferrer"
        >
          Official PayPal API specification
        </a>
      </p>
    </details>
  );
}
