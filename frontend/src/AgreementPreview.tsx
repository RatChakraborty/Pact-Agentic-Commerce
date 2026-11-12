import { money } from "./workflow";
export type BriefPreview = {
  objective: string;
  budget: number;
  deadline: string;
  criteria: string[];
};
export function intentionalDeadline(now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() + 8);
  d.setHours(17, 0, 0, 0);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
export function previewFromForm(
  form: HTMLFormElement,
  defaults: BriefPreview,
): BriefPreview {
  const f = new FormData(form),
    n = Number(f.get("budget"));
  return {
    objective: String(f.get("objective") || ""),
    budget: Number.isFinite(n) ? Math.round(n * 100) : defaults.budget,
    deadline: String(f.get("deadline") || defaults.deadline),
    criteria: defaults.criteria,
  };
}
export default function AgreementPreview({ brief }: { brief: BriefPreview }) {
  return (
    <aside
      className="provisional-preview"
      aria-label="Provisional agreement preview"
      aria-live="polite"
    >
      <span className="eyebrow">PROVISIONAL AGREEMENT</span>
      <h2>{brief.objective || "Your project objective"}</h2>
      <p className="state-chip pending">Not agreed · not locked</p>
      <dl>
        <dt>Buyer maximum</dt>
        <dd className="mono">{money(brief.budget)}</dd>
        <dt>Delivery</dt>
        <dd>
          {brief.deadline
            ? new Date(brief.deadline).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : "Choose a deadline"}
        </dd>
        <dt>Acceptance scope</dt>
        <dd>Static HTML · {brief.criteria.join(", ")}</dd>
        <dt>Negotiation limits</dt>
        <dd>Fixed scope and recipient. No offer can authorize a payment.</dd>
        <dt>Human authorization</dt>
        <dd>
          Required parties must confirm the same version. Buyer approval is
          required for any financial handoff.
        </dd>
      </dl>
      <p className="muted">
        This updates with your brief. It is a preview, not an offer or
        contractual commitment.
      </p>
    </aside>
  );
}
