# TradingView chart CSP allowlist — 2026-11-23

The BIST hub and stock pages now render an official TradingView Advanced Chart
embed, but the site's response policy did not allow its bootstrap script host
or its chart iframe host. The chart could therefore be blocked by the same
CSP that protects the rest of the site.

The policy now allows the exact documented bootstrap host,
`https://s3.tradingview.com`, in `script-src`, plus TradingView subdomains in
`frame-src`. No wildcard was added to script execution. The official embed
example uses that S3 script URL:
https://www.tradingview.com/widget-docs/tutorials/iframe/build-page/widget-integration/

The chart heading now links to the matching TradingView symbol page with
`noopener`, `noreferrer` and `nofollow`. This provides visible provider
attribution and a direct fallback if the embedded chart is unavailable. The
official Advanced Chart example includes a symbol link and TradingView credit:
https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/

Verification: `node --check next.config.mjs` and `git diff --check` passed.
Browser rendering was not exercised, so the remaining vendor request hosts
have not been measured.
