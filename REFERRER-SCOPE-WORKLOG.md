# Request-local pageview privacy

Prepare only; no push or deployment. Preserve the existing privacy-safe fixed pageview, route allowlist, disclosure and local-input promises. Remove only the telemetry-added whole-page no-referrer meta, which unnecessarily suppressed unrelated link and app referrals. Pin the reviewed local Umami SDK with one request-local no-referrer option; scope both script GETs and the telemetry POST. Auto-tracking, click capture and input collection remain disabled. All other content, icons, manifests and extension files stay unchanged.

Baseline 7ef777f64843780a51ea7ecce944cda125d79315. Current upstream checked by read-only SSH Git transport; JSON branded-source successor is ahead of the still-older GitHub Pages mirror, explicitly retained. Prior source trees remain untouched.

Focused SDK/mock-wire fixtures exercise all configured hosts/routes, fixed input-free payload, request-local referrerPolicy and unchanged app fetch. Root performed the task-owned in-app-browser localhost check: six real POSTs and wrapper/SDK GETs had no Referer, while an unrelated app fetch retained its normal Referer. Receipt2a692f29 is local synthetic transport proof, not provider delivery. The child CUA route was unavailable before tab creation; root owned and closed tab73; server stopped. R8 isolated build/test results recorded in the external integration receipt after execution.

Verification: 4 focused request-scope groups pass per site (96 host/page cases across all six). 75 existing app tests and production build pass on R8 with independently copied, offline-validated dependencies. No skipped cases. Initial runner missing-lock assumption and JSON full-HTML fixture failure are retained in the external packet; corrections do not change production payloads.

Deployment remains future: source/previews are not fresh live preimages. Transform only fresh pinned live head bytes to preserve generated icon/manifest tags, use new SDK no-clobber then wrapper then HTML, and stop on writer/hash/metadata drift. Do not full-rsync this checkout.
