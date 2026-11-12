import { useEffect, useState, type FormEvent } from "react";
import { api } from "./api";
import PaymentVerification from "./PaymentVerification";
import AgreementPreview, {
  intentionalDeadline,
  previewFromForm,
} from "./AgreementPreview";
import Progress, { stateTone } from "./Progress";
import { filterAgreements } from "./agreementFilters";
import { money } from "./workflow";

const base = "/demo-market";
const stateLabel = (s: string) => s.toLowerCase().replaceAll("_", " ");
export default function Market({ entry }: { entry: "buyer" | "seller" }) {
  const [brief, setBrief] = useState(() => ({
    objective: "Build a static landing page for our design studio.",
    budget: 30000,
    deadline: intentionalDeadline(),
    criteria: ["hero", "features", "contact"],
  }));
  const [filter, setFilter] = useState("all");
  const [persona, setPersona] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh(id?: string, signal?: AbortSignal) {
    const p = await api(base + "/persona", undefined, signal);
    const s = await api(base + "/services", undefined, signal);
    const records = p ? await api(base + "/agreements", undefined, signal) : [];
    const current =
      p && id ? await api(base + "/agreements/" + id, undefined, signal) : null;
    if (signal?.aborted) return;
    setPersona(p);
    setServices(s);
    setAgreements(records);
    if (current) setSelected(current);
  }
  useEffect(() => {
    const controller = new AbortController();
    refresh(undefined, controller.signal)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setReady(true);
      });
    return () => controller.abort();
  }, []);
  async function run(fn: () => Promise<any>, keep = true) {
    setBusy(true);
    setError("");
    try {
      const result = await fn();
      await refresh(keep ? result?.id || selected?.id : undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function act(action: string, body: unknown = { confirmed: true }) {
    return run(() => api(`${base}/agreements/${selected.id}/${action}`, body));
  }
  function submit(
    e: FormEvent<HTMLFormElement>,
    fn: (f: FormData) => Promise<any>,
    keep = true,
  ) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(() => fn(f), keep);
  }
  return (
    <>
      <header>
        <a className="brand" href="/">
          <span className="mark">p</span>Pact
        </a>
        <a href="/demo">Explore recorded demo →</a>
      </header>
      <main>
        <span className="eyebrow">
          {(persona?.role || entry) === "buyer" ? "CUSTOMER" : "BUSINESS"} ·
          DEMO SESSION
        </span>
        <h1>
          {persona
            ? persona.role === "buyer"
              ? "Your projects"
              : "Your studio"
            : entry === "buyer"
              ? "Start as a customer"
              : "Start as a business"}
        </h1>
        <p className="muted">
          {entry === "buyer"
            ? "Your brief, your budget, your final say."
            : "Your services, your terms, your commitments."}
        </p>
        <details className="demo-truth">
          <summary>About this interactive demo</summary>
          <p>
            Browser-bound demo identities, not real accounts or verified
            businesses. Use another browser/private window for the other party.
            Identities expire in 24 hours and cannot be recovered. Agents run
            within Pact using deterministic rules; no live AI or payments.
          </p>
        </details>
        {error && (
          <div className="service-error">
            <p role="alert" className="blocked-label">
              {error}
            </p>
            <a className="quiet" href="/demo">
              Explore recorded demo →
            </a>
            <button
              disabled={busy}
              onClick={() => run(() => Promise.resolve({}))}
            >
              Retry interactive service
            </button>
          </div>
        )}
        {!ready ? (
          <p role="status">Loading demo workspace…</p>
        ) : !persona ? (
          <form
            onSubmit={(e) =>
              submit(
                e,
                (f) =>
                  api(base + "/persona", { role: entry, name: f.get("name") }),
                false,
              )
            }
          >
            <label>
              Demo display name
              <input
                name="name"
                required
                minLength={2}
                maxLength={60}
                defaultValue={
                  entry === "buyer" ? "Customer demo" : "Studio demo"
                }
              />
            </label>
            <p>
              This creates a demo persona, not a registered account. Do not
              enter private client information.
            </p>
            <button className="primary" disabled={busy}>
              Start {entry === "buyer" ? "customer" : "business"} demo
            </button>
          </form>
        ) : (
          <>
            <div className="action-row">
              <p>
                {persona.name} ·{" "}
                {persona.role === "buyer" ? "Customer" : "Business"} demo
              </p>
              <button
                disabled={busy}
                onClick={() => run(() => Promise.resolve({ id: selected?.id }))}
              >
                Refresh shared activity
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await api(base + "/logout", {});
                    window.location.assign("/");
                  }, false)
                }
              >
                End demo session
              </button>
            </div>
            {selected ? (
              <>
                <button className="quiet" onClick={() => setSelected(null)}>
                  ← Back to {persona.role === "buyer" ? "projects" : "studio"}
                </button>
                <Progress status={selected.status} demo shared />
                <section className="objective">
                  <div>
                    <span className="eyebrow">
                      SHARED AGREEMENT · v{selected.version}
                    </span>
                    <h2>{selected.objective}</h2>
                    <p>
                      {selected.buyer_name} ↔ {selected.seller_name}
                    </p>
                  </div>
                  <span className={`status ${stateTone(selected.status)}`}>
                    {stateLabel(selected.status)}
                  </span>
                </section>
                <section className="next">
                  <div>
                    <h3>
                      {selected.amount_minor == null
                        ? "Awaiting a proposal"
                        : money(selected.amount_minor)}
                    </h3>
                    <p>
                      Scope: {selected.criteria.join(", ")} · Deliver by{" "}
                      {new Date(selected.deadline).toLocaleDateString()}
                    </p>
                    <p>
                      Payment: not created. This demo cannot create invoices or
                      authorize payments.
                    </p>
                    {selected.role === "buyer" ? (
                      <p>
                        Your private maximum: {money(selected.budget_minor)}
                      </p>
                    ) : (
                      <p>
                        Your private minimum:{" "}
                        {money(selected.seller_floor_minor)}
                      </p>
                    )}
                    <div
                      className="human-confirmations"
                      aria-label="Human confirmations"
                    >
                      {["buyer", "seller"].map((role) => (
                        <span
                          key={role}
                          className={`state-chip ${selected.approvals.includes(role) ? "approved" : "pending"}`}
                        >
                          {role === "buyer" ? "Customer" : "Seller"} ·{" "}
                          {selected.approvals.includes(role)
                            ? "confirmed"
                            : "confirmation required"}
                        </span>
                      ))}
                    </div>
                  </div>
                  {selected.role === "seller" &&
                    selected.status === "AWAITING_SELLER" && (
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() => act("authorize")}
                      >
                        Authorize seller agent
                      </button>
                    )}
                  {selected.role === "buyer" && selected.status === "DRAFT" && (
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => act("negotiate")}
                    >
                      Run deterministic negotiation
                    </button>
                  )}
                  {selected.status === "PROPOSED" &&
                    !selected.approvals.includes(selected.role) && (
                      <button
                        className="primary"
                        disabled={
                          busy || selected.critique?.verdict !== "CLEAR"
                        }
                        onClick={() =>
                          act("approve", {
                            version: selected.version,
                            confirmed: true,
                            terms_digest: selected.terms_digest,
                          })
                        }
                      >
                        Confirm terms as{" "}
                        {selected.role === "buyer" ? "customer" : "seller"}
                      </button>
                    )}
                  {[
                    "AWAITING_SELLER",
                    "DRAFT",
                    "PROPOSED",
                    "NEGOTIATION_FAILED",
                  ].includes(selected.status) && (
                    <button disabled={busy} onClick={() => act("decline")}>
                      Decline request
                    </button>
                  )}
                </section>
                <section className="negotiation">
                  <div className="section-heading">
                    <h2>The shared negotiation</h2>
                    <span>Deterministic demo · no AI calls</span>
                  </div>
                  {!selected.offers.length && (
                    <p>
                      No offers exchanged. Seller authorization is required
                      before negotiation.
                    </p>
                  )}
                  <ol className="timeline">
                    {selected.offers.map((o: any, i: number) => (
                      <li key={i}>
                        <div className="avatar">
                          {o.role === "buyer" ? "B" : "S"}
                        </div>
                        <div>
                          <strong>
                            {o.role === "buyer"
                              ? "Buyer agent"
                              : "Seller agent"}{" "}
                            · {o.action} · {money(o.amount_minor)}
                          </strong>
                          <p>{o.explanation}</p>
                          <small>
                            {o.currency} · {o.criteria.join(", ")} ·{" "}
                            {o.recipient}
                          </small>
                          {o.blocked && (
                            <p className="blocked-label">
                              Blocked · {o.blocked}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {selected.negotiation_error && (
                    <p role="status">{selected.negotiation_error}</p>
                  )}
                </section>
                {selected.critique && (
                  <details
                    className="secondary"
                    open={selected.critique.verdict !== "CLEAR"}
                  >
                    <summary>Proposal wording & integrity</summary>
                    <p>
                      {selected.critique.verdict} ·{" "}
                      {selected.critique.explanation}
                    </p>
                    <p>
                      {selected.critique.limitation} The existing live semantic
                      critic remains in the single-player workspace; no
                      dedicated SLM is deployed.
                    </p>
                    <p className="digest">
                      Shared terms fingerprint: {selected.terms_digest}
                    </p>
                    <p>
                      Private negotiation limits are excluded from this public
                      fingerprint and protected separately on the server.
                    </p>
                  </details>
                )}
                {selected.role === "seller" &&
                  ["AWAITING_EVIDENCE", "NEEDS_REVIEW"].includes(
                    selected.status,
                  ) && (
                    <section className="evidence">
                      <h2>Submit deliverable evidence</h2>
                      <p>
                        Only the seller may submit. Static HTML is inspected,
                        never executed.
                      </p>
                      <button
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            const example = await api("/demo/example");
                            return api(
                              `${base}/agreements/${selected.id}/evidence`,
                              { html: example.html },
                            );
                          })
                        }
                      >
                        Submit example evidence
                      </button>
                      <label>
                        Landing-page HTML
                        <input
                          type="file"
                          accept=".html,.htm,text/html"
                          disabled={busy}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 100000) {
                              setError("Use a file under 100 KB.");
                              return;
                            }
                            run(async () =>
                              api(
                                `${base}/agreements/${selected.id}/evidence`,
                                { html: await file.text() },
                              ),
                            );
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </section>
                  )}
                {selected.verification && (
                  <section className="verification">
                    <h2>
                      Deliverable checks · {selected.verification.overall}
                    </h2>
                    {selected.verification.checks.map((c: any) => (
                      <p key={c.criterion}>
                        {c.passed ? "✓" : "×"} {c.evidence}
                      </p>
                    ))}
                    <small>{selected.verification.limitation}</small>
                  </section>
                )}
                {selected.role === "buyer" &&
                  ["AWAITING_BUYER_REVIEW", "NEEDS_REVIEW"].includes(
                    selected.status,
                  ) && (
                    <form
                      className="evidence"
                      onSubmit={(e) =>
                        submit(e, (f) =>
                          api(`${base}/agreements/${selected.id}/review`, {
                            accepted: f.get("decision") === "accept",
                            reason: f.get("reason"),
                          }),
                        )
                      }
                    >
                      <h2>Review the deliverable</h2>
                      <label>
                        Decision
                        <select name="decision">
                          <option value="reject">Request changes</option>
                          <option value="accept">
                            Accept deliverable (no payment)
                          </option>
                        </select>
                      </label>
                      <label>
                        Review reason
                        <textarea
                          name="reason"
                          required
                          minLength={10}
                          maxLength={500}
                        />
                      </label>
                      <button className="primary" disabled={busy}>
                        Record customer review
                      </button>
                    </form>
                  )}
                {selected.status === "DEMO_COMPLETE" && (
                  <p role="status">
                    Two-sided demo complete. No invoice or payment was created.
                    Inspect the clearly separate historical PayPal receipt
                    below.
                  </p>
                )}
                <PaymentVerification agreement={selected} />
                <details className="secondary">
                  <summary>Shared contractual history</summary>
                  {selected.history.map((e: any, i: number) => (
                    <div className="audit-row" key={i}>
                      <time>{new Date(e.at).toLocaleString()}</time>
                      <span>
                        {e.role} · {stateLabel(e.action)}
                      </span>
                      <small>{stateLabel(e.status)}</small>
                    </div>
                  ))}
                </details>
              </>
            ) : (
              <>
                <section>
                  <h2>
                    {persona.role === "buyer"
                      ? "My requests"
                      : "Incoming requests & agreements"}
                  </h2>
                  {!agreements.length && (
                    <p>
                      No requests yet.{" "}
                      {persona.role === "seller"
                        ? "Publish a demo service, then open the customer entry in a separate browser context."
                        : "Select a listed demo service below."}
                    </p>
                  )}
                  <label className="agreement-filter">
                    Show agreements
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All agreements</option>
                      <option value="decision">Needs your decision</option>
                      <option value="active">Active negotiation</option>
                      <option value="evidence">
                        Deliverable follow-through
                      </option>
                      <option value="history">Historical agreements</option>
                    </select>
                  </label>
                  {agreements.length > 0 &&
                    filterAgreements(agreements, filter, persona.role)
                      .length === 0 && <p>No agreements match this view.</p>}
                  {filterAgreements(agreements, filter, persona.role).map(
                    (a: any) => (
                      <button
                        className="history"
                        key={a.id}
                        onClick={() =>
                          run(async () => {
                            const x = await api(`${base}/agreements/${a.id}`);
                            setSelected(x);
                            return x;
                          })
                        }
                      >
                        {a.objective}
                        <small>
                          {stateLabel(a.status)} ·{" "}
                          {a.amount_minor == null
                            ? "Price pending"
                            : money(a.amount_minor)}{" "}
                          · {new Date(a.created_at).toLocaleDateString()}
                        </small>
                      </button>
                    ),
                  )}
                </section>
                {persona.role === "seller" ? (
                  <section className="evidence">
                    <h2>Your demo service</h2>
                    {services
                      .filter((s) => s.mine)
                      .map((s) => (
                        <div key={s.id}>
                          <h3>{s.title}</h3>
                          <p>{s.description}</p>
                          <p>
                            Public asking price {money(s.asking_minor)} ·
                            Private minimum {money(s.seller_floor_minor)}
                          </p>
                          <a
                            href={`/?view=customer&service=${encodeURIComponent(s.id)}`}
                          >
                            Customer invitation link ↗
                          </a>
                        </div>
                      ))}
                    <details open={!services.some((s) => s.mine)}>
                      <summary>Publish a demo service</summary>
                      <form
                        onSubmit={(e) =>
                          submit(
                            e,
                            (f) =>
                              api(base + "/services", {
                                title: f.get("title"),
                                description: f.get("description"),
                                asking_minor: Math.round(
                                  Number(f.get("ask")) * 100,
                                ),
                                seller_floor_minor: Math.round(
                                  Number(f.get("floor")) * 100,
                                ),
                              }),
                            false,
                          )
                        }
                      >
                        <label>
                          Service title
                          <input
                            name="title"
                            required
                            minLength={5}
                            maxLength={100}
                            defaultValue="Studio landing page"
                          />
                        </label>
                        <label>
                          Public service description
                          <textarea
                            name="description"
                            required
                            minLength={10}
                            maxLength={600}
                            defaultValue="A static landing page with hero, features and contact sections."
                          />
                        </label>
                        <div className="form-grid">
                          <label>
                            Public asking price (USD)
                            <input
                              name="ask"
                              type="number"
                              min={1}
                              max={2000}
                              step="0.01"
                              defaultValue={360}
                              required
                            />
                          </label>
                          <label>
                            Private seller minimum (USD)
                            <input
                              name="floor"
                              type="number"
                              min={1}
                              max={1000}
                              step="0.01"
                              defaultValue={240}
                              required
                            />
                          </label>
                        </div>
                        <button className="primary" disabled={busy}>
                          Publish demo service
                        </button>
                      </form>
                    </details>
                  </section>
                ) : (
                  <section className="evidence">
                    <h2>Discover demo services</h2>
                    <p>
                      These are unverified listings created by demo
                      participants, not verified independent businesses.
                    </p>
                    {!services.length && (
                      <p>
                        No services listed yet. Start the business demo in
                        another browser context to publish one.
                      </p>
                    )}
                    {services
                      .filter(
                        (s) =>
                          !new URLSearchParams(location.search).get(
                            "service",
                          ) ||
                          s.id ===
                            new URLSearchParams(location.search).get("service"),
                      )
                      .map((s) => (
                        <button
                          className="history"
                          key={s.id}
                          onClick={() => setService(s)}
                        >
                          {s.title} · {money(s.asking_minor)} asking
                          <small>
                            {s.seller_name} · {s.description}
                          </small>
                        </button>
                      ))}
                    {service && (
                      <form
                        className="brief-layout request-form"
                        onInput={(e) =>
                          setBrief(previewFromForm(e.currentTarget, brief))
                        }
                        onSubmit={(e) =>
                          submit(e, async (f) => {
                            const x = await api(
                              `${base}/services/${service.id}/requests`,
                              {
                                objective: f.get("objective"),
                                budget_minor: Math.round(
                                  Number(f.get("budget")) * 100,
                                ),
                                deadline: new Date(
                                  String(f.get("deadline")),
                                ).toISOString(),
                                authorize_agent: true,
                              },
                            );
                            setSelected(x);
                            return x;
                          })
                        }
                      >
                        <h3>Request {service.title}</h3>
                        <label>
                          Project objective
                          <textarea
                            name="objective"
                            minLength={10}
                            maxLength={1000}
                            required
                            defaultValue="Build a static landing page for our design studio."
                          />
                        </label>
                        <div className="form-grid">
                          <label>
                            Your private maximum (USD)
                            <input
                              name="budget"
                              type="number"
                              min={1}
                              max={1000}
                              step="0.01"
                              defaultValue={300}
                              required
                            />
                          </label>
                          <label>
                            Delivery date
                            <input
                              name="deadline"
                              type="datetime-local"
                              defaultValue={brief.deadline}
                              required
                            />
                          </label>
                        </div>
                        <fieldset className="acceptance-scope">
                          <legend>Acceptance scope</legend>
                          <p>
                            Static HTML · hero, features, contact. Up to six
                            deterministic negotiation turns. No paid inference
                            or payment authority.
                          </p>
                        </fieldset>
                        <label className="consent-label">
                          <input type="checkbox" required /> I authorize my
                          buyer agent to negotiate this request.
                        </label>
                        <button className="primary" disabled={busy}>
                          Send negotiation request
                        </button>
                        <AgreementPreview brief={brief} />
                      </form>
                    )}
                  </section>
                )}
              </>
            )}
          </>
        )}
        <footer>
          <span>Demo personas · no account authentication</span>
          <a href="/">Back to Pact</a>
        </footer>
      </main>
    </>
  );
}
