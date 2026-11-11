# Sponsor integration report

Investigated November 11, 2026. An installed dependency, inspected declaration file or deployment template is not evidence of a completed service integration or prize eligibility.

| Sponsor | Classification | Actual use / evidence | Requirements and prize relevance |
| --- | --- | --- | --- |
| PayPal | IMPLEMENTED | Actual sandbox OAuth, invoice create/read/send and repeated status retrieval. Existing invoice is now genuinely provider-confirmed `PAID` for $300 USD; repeated application reconciliation passed. | Merchant app credentials already work. Buyer checkout completed externally. Relevant to PayPal + AI and agentic-commerce judging; final eligibility is the organizer's decision. |
| APIMatic | PARTIAL | Official `apimatic/context-plugins-installer` instructions used. Invoked `context-plugins list --json`, `doctor --json`, and `install paypal --targets codex -y`. Marketplace lists PayPal, Node and Codex are compatible. **The PayPal plugin could not register, so it was not invoked to review Pact. No APIMatic implementation contribution is claimed.** | No additional API secret was requested. Installation requires writable `~/.context-plugins` and Codex's marketplace installation directory. Both are read-only in this managed image. `NODE_USE_ENV_PROXY=1` makes the official CLI's network access work. Enable plugin installation in a compatible host/session, then rerun the actual PayPal context review. Sponsor eligibility is unestablished. |
| AG Studio / Studio Agent Framework | PARTIAL | Queried actual `ag-studio` and `ag-studio-react` 3.1.0 npm metadata, downloaded the official package for inspection, and examined its `AgAiAgentDefinition`, `AgAiAgentRunner`, built-in agents and tool/runner declarations. React 19 is supported. **No Studio runtime or agent was invoked in Pact.** | Both packages are Commercial; no Studio/Grid license binding is configured. Official README offers a 45-day enterprise trial. A suitable license/trial and a bounded server-only LLM adapter would be needed for a demonstrable agent-assisted investigator. The docs host is blocked by current egress policy. No sophisticated analytics or eligibility claim is made. |
| AG Grid | DEFERRED | Existing audit disclosure remains functional; no table was added merely to claim a sponsor. | Community is available under MIT, but a plain table would not fulfill the requested Studio/agent use case. Studio's enterprise dependencies need the applicable terms. |
| Render | PARTIAL | Prepared `render.yaml` and operator instructions; added and tested optional HTTPS cookies, exact-origin checks and a private operator gate. Persistent SQLite uses a mounted disk. No Render service/API or Workflows job was invoked. | Requires a Render account, a disk-capable paid service plan, approved deployment, actual HTTPS origin, generated persistent session/access secrets and securely entered existing PayPal/AI credentials. No Render API key is needed for manual dashboard setup. Deployment remains unauthorized. Eligibility cannot be claimed from configuration alone. |
| Bryntum | DEFERRED | No scheduling added; the single milestone needs no scheduling product. | No license requested. Core workflow and submission take priority. |
| Channel3 | DEFERRED | No catalog/procurement requirement in this fixed-scope service demo. | No credentials requested. |
| Elastic | DEFERRED | Local SQLite audit is sufficient for the bounded demo. | No deployment or credentials requested. |
| KERNEL | DEFERRED | Existing Playwright/Chromium tests cover the required UI checks. | No additional browser service credentials requested. |
| Postman | DEFERRED | Reproducible pytest provider contracts already exercise API behavior. | No workspace/API credential requested. |
| Astropods | DEFERRED | No clear low-risk need within the current contract workflow. | No credentials requested. |
| Zapier | DEFERRED | No asynchronous business automation is needed for P0; payment remains explicit. | No account connection requested. |

## Exact commands and supported sources

```bash
NODE_USE_ENV_PROXY=1 npm exec --yes --package=context-plugins -- context-plugins list --json
NODE_USE_ENV_PROXY=1 npm exec --yes --package=context-plugins -- context-plugins doctor --json
NODE_USE_ENV_PROXY=1 npm exec --yes --package=context-plugins -- context-plugins install paypal --targets codex -y
npm view ag-studio version license readme --json
npm view ag-studio-react version license peerDependencies dependencies --json
npm pack ag-studio
```

The installer reported `failed to create marketplace install directory ... Read-only file system`. This is a host capability limitation, not missing PayPal credentials. We did not change protected host directories, disable TLS checks, or claim that listing a plugin invokes it.

Sources inspected:

- [APIMatic official installer](https://github.com/apimatic/context-plugins-installer)
- [Actual context marketplace](https://github.com/context-plugins/plugin-marketplace)
- [AG Studio npm package](https://www.npmjs.com/package/ag-studio), [React wrapper](https://www.npmjs.com/package/ag-studio-react)
- [AG Studio official trial/license page](https://www.ag-grid.com/studio/license-pricing/?tab=trial), linked by the npm README; direct documentation access was blocked here
- [Render FastAPI example](https://github.com/render-examples/fastapi); [persistent disk documentation](https://render.com/docs/disks), direct docs access blocked here

## Optional Activity & Insights design, deliberately not shipped

A meaningful Studio integration would load only the current browser's agreements, proposals, verification checks and audit events. A bounded investigator could explain blocked offers, filter events and cross-reference a provider status with an accepted fingerprint. It must have **no payment-write tools**, no direct browser API key, and a separate explicit call allowance. It belongs behind the Workspace menu as **Activity & Insights**, with a close action returning to the untouched primary workspace. No persistent dashboard, invented metrics or static-table-as-agent claim is acceptable.

Buyer payment is now verified. Commercial/host prerequisites still prevent the optional Studio/context-plugin integrations. No unused sponsor runtime libraries were added to the product bundle.
