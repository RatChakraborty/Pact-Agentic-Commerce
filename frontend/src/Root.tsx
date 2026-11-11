import App from "./App";
import Market from "./Market";

export default function Root() {
  const view = new URLSearchParams(window.location.search).get("view");
  if (view === "customer" || view === "business")
    return <Market entry={view === "customer" ? "buyer" : "seller"} />;
  if (view === "workspace" || view === "agreements") return <App />;
  return (
    <>
      <header>
        <a className="brand" href="/">
          <span className="mark">p</span>Pact
        </a>
        <a href="/?view=agreements">Your agreements ↗</a>
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
          <a className="primary" href="/?view=workspace">
            Try interactive demo →
          </a>
          <a className="quiet" href="/?view=agreements">
            Your agreements
          </a>
        </div>
        <p className="muted">
          The interactive demo uses deterministic agents and creates no
          payments. Separate recorded evidence shows real AI negotiation and a
          PayPal sandbox invoice confirmed PAID.
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
          <span className="eyebrow">OPTIONAL · TWO-PERSONA DEMO</span>
          <h2>Explore both sides of an agreement.</h2>
          <p>
            Create a demo listing as a business, then use a separate browser
            context as a customer. Each party has a private negotiation limit
            and confirms the same shared terms. These are isolated demo
            identities, not registered accounts or verified businesses. No live
            AI or payments in this flow.
          </p>
          <div className="action-row">
            <a className="primary" href="/?view=customer">
              I'm a customer →
            </a>
            <a className="primary" href="/?view=business">
              I'm a business →
            </a>
          </div>
        </section>
        <footer>
          <span>Pact · Intent into agreement.</span>
          <span>Sandbox only · MIT licensed</span>
        </footer>
      </main>
    </>
  );
}
