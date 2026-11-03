# Website pageview preparation — 2026-11-03

Goal: honor the explicit request to track public sites while keeping private tool inputs out of analytics and replacing the earlier no-tracking claim with an accurate notice. Fresh upstream main was used as the source base; this isolated clone has not been deployed.

Prepared a narrowly scoped self-hosted pageview, opt-out handling, no-referrer policy, and a linked privacy notice. The wrapper was copied from the shared reviewed SDK investigation and adapted to this exact hostname and fixed paths. Independent source review is pending. The live deployment server tracked HEAD matches this clone base; that does not establish byte-for-byte build provenance. No live analytics collection is claimed.

Next: validate actual request contents and referrer, reconcile deployment ownership and origin revision, build/test the user journey and icons on desktop/mobile, then deploy using the current writer without overwriting unrelated changes.

## Checks and current state

R8 build and 75 existing application tests passed using an isolated copy of the available dependencies after npm dependency validation. After the wrapper guard was tightened, the final build passed again. Four-site VM tests passed 16/16 against the captured exact Umami SDK; the separate browser local-receiver check demonstrated no Referer or Cookie and fixed-payload requests for the same shared wrapper design. No real provider event or ingestion was tested. Desktop previews and 390x844 responsive views were inspected; chess demo, time FAQ and text-cleaning journeys worked. The weather preview showed the clearly marked sample fallback because live forecasts were unreachable, not a verified live forecast. No console warnings/errors were observed in these previews.

Still required: independent source review, current upstream/host state checks, guarded publishing through the active app writer, live icon/notice checks, and a separately identified QA event followed by normally scheduled ingestion verification.
