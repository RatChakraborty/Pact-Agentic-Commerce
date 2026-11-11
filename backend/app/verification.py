from html.parser import HTMLParser

from .domain import now


class ArtifactParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.sections = set()
        self.danger = False
        self.text = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id") in {"hero", "features", "contact"}:
            self.sections.add(attrs["id"])
        if tag in {"script", "iframe", "object", "embed"} or any(
            k.startswith("on") for k in attrs
        ):
            self.danger = True

    def handle_data(self, data):
        self.text.append(data.strip())


def verify(a, html):
    p = ArtifactParser()
    p.feed(html)
    checks = [
        {
            "criterion": c,
            "passed": c in p.sections,
            "evidence": f'Section id="{c}" '
            + ("present" if c in p.sections else "missing"),
        }
        for c in a["criteria"]
    ]
    checks.append(
        {
            "criterion": "static artifact",
            "passed": not p.danger,
            "evidence": "Active content detected"
            if p.danger
            else "No scripts, embedded documents or inline handlers detected",
        }
    )
    checks.append(
        {
            "criterion": "content",
            "passed": len(" ".join(p.text)) >= 40,
            "evidence": f"{len(' '.join(p.text))} text characters observed",
        }
    )
    return {
        "checks": checks,
        "overall": "PASS" if all(c["passed"] for c in checks) else "FAIL",
        "agreement_version": a["version"],
        "evaluated_at": now(),
        "verifier_version": "static-html-v1",
        "limitation": "Structural checks only; no visual quality, deployment, or legal compliance assessment. Artifact is never executed.",
    }
