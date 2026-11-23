# Privacy disclosure reconciliation — 2026-11-23

The privacy and cookie pages claimed that Vercel Analytics measured traffic,
but the app imports only the consent-gated Google Analytics component and
does not include or render a Vercel Analytics integration. Removed the
unsupported Vercel Analytics claims and updated both disclosure dates.

The cookie policy now describes GA page and interaction measurement without
claiming that all event data is aggregated. The privacy page continues to
describe the app's first-party page-path counter and short-lived technical
logs separately from optional Google Analytics.

Verification: repository search confirmed no Vercel Analytics integration or
remaining policy claim; `git diff --check` passed. No tests, build or
deployment were run.
