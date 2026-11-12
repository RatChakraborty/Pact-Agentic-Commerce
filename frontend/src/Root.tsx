import App from "./App";
import Market from "./Market";
import Replay from "./Replay";
import { PaymentPage } from "./PaymentVerification";

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
  if (view === "try")
    return (
      <>
        <header>
          <a className="brand" href="/">
            Pact
          </a>
          <a href="/demo">Explore recorded demo</a>
        </header>
        <main>
          <h1>Which side of the agreement are you on?</h1>
          <p>
            Create a browser-bound demo identity. Use separate browser contexts
            for both parties. No real accounts, live AI or payments in this
            interactive flow.
          </p>
          <div className="action-row">
            <a className="primary" href="/customer">
              I’m a customer
            </a>
            <a className="quiet" href="/business">
              I’m a business
            </a>
          </div>
          <p>
            <a href="/sandbox">Advanced single-player sandbox</a>
          </p>
        </main>
      </>
    );
  if (view === "customer" || view === "business")
    return <Market entry={view === "customer" ? "buyer" : "seller"} />;
  if (view === "workspace" || view === "agreements") return <App />;
  return (
    <>
      <header>
        <a className="brand" href="/">
          <span className="mark">p</span>Pact
        </a>
        <nav className="payment-navigation" aria-label="Primary navigation">
          <a href="/payments">PayPal verification</a>
          <a href="/?view=agreements">Your agreements →</a>
        </nav>
      </header>
      <main className="landing">
        <span className="eyebrow">AGENTS NEGOTIATE. PEOPLE DECIDE.</span>
        <h1>
          Find common ground.
          <br />
          Keep control of the deal.
        </h1>
        <p className="landing-intro">
          Turn a project brief into an inspectable agreement. Buyer and seller
          agents exchange structured offers. People confirm the terms, review
          milestone evidence, and authorize payment.
        </p>
        <div className="action-row">
          <a className="primary" href="/demo">
            Explore the demo →
          </a>
          <a className="quiet" href="/?view=agreements">
            Your agreements
          </a>
        </div>
        <p className="muted">
          Explore genuine recorded AI replies without credentials or a database.
          Replay creates no contracts or payments. The separate sandbox payment
          receipt is clearly attributed to its original invoice.
        </p>
        <section className="landing-steps">
          <article>
            <span className="eyebrow">01 · NEGOTIATE</span>
            <h2>A deal within your limits.</h2>
            <p>
              Inspect each offer, price, explanation and policy block. Agents
              cannot authorize payment.
            </p>
          </article>
          <article>
            <span className="eyebrow">02 · AGREE & VERIFY</span>
            <h2>Know what you approved.</h2>
            <p>
              Version-bound confirmations lock structured terms. Milestone
              checks show their evidence and limits.
            </p>
          </article>
          <article>
            <span className="eyebrow">03 · AUTHORIZE</span>
            <h2>You make the final call.</h2>
            <p>
              PayPal sandbox status comes from the provider. An invoice request
              never means funds are held or paid.
            </p>
          </article>
        </section>
        <section className="evidence">
          <span className="eyebrow">TRY IT YOURSELF</span>
          <h2>Explore both sides of an agreement.</h2>
          <p>
            Create a demo listing as a business, then use a separate browser
            context as a customer. Each party has a private negotiation limit
            and confirms the same shared terms. These are isolated demo
            identities, not registered accounts or verified businesses. No live
            AI or payments in this flow.
          </p>
          <a className="quiet" href="/try">
            Try it yourself →
          </a>
        </section>
        <footer>
          <span>Pact · Intent into agreement.</span>
          <span>Sandbox only · MIT licensed</span>
        </footer>
      </main>
    </>
  );
}
