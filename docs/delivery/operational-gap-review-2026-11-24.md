# Operational gap review — 24 November 2026

This is a current-state review, not an account invoice or a promise of Google
rankings. Read-only production queries and public HTTP checks were used; no
model API calls, Search Console API requests, database writes, or test-suite
runs were made for this review.

## Highest-priority findings

### AI spend and remaining balance

- Production has `AI_AUTOMATION_ENABLED=false` and
  `AI_DAILY_SPEND_LIMIT_USD=0`. The news and guide writer timers are absent;
  the six-hour `gf-nobet` timer ran on 24 November and logged that it skipped
  its paid LLM ping because automation is off. GSC and index timers remain
  enabled and are not writer jobs.
- A read-only database query found **zero cost events and zero model-spend
  reservations in the prior 24 hours**. The latest recorded cost event was
  22 November at 22:06:33 UTC. This is app-ledger evidence, not a provider
  account statement.
- The earlier rolling-30-day estimate was $0.5013 for 92 OpenAI-labeled
  responses. Another 879 Gemini 2.5 Flash responses imply about $3.29 at
  Google's standard paid-tier rates; free-tier eligibility and actual billing
  are unknown. A further 100 legacy cloud-model responses were unpriced.
  These estimates do not prove provider charges or remaining credit.
- Production still contains OpenAI and Google-compatible key variables. The
  zero spend guard and disabled automation prevent the app's writer path from
  using them. Their presence does not prove that a key is valid or has balance.
  The OpenAI balance remains unknown because the account usage endpoint
  returned 403 and no billing session was available.

### Search traffic and discovery

- The latest stored 28-day GSC window (25 October–21 November) contains 2,610
  impressions, 4 clicks, and 0.15% CTR. `/doviz/eur-try` led with 449
  impressions, 0 clicks, and weighted average position 71.7; `/doviz/usd-try`
  had 389 impressions, 4 clicks, and position 68.6. Most visibility is too
  low in results for title edits alone to address.
- A smaller near-result query is “euro ne kadar”: 20 impressions, 0 clicks,
  position 23.6 for `/doviz/eur-try`. Its page already provides the daily
  reference rate, TCMB values, a converter, history, and an explicit notice
  that rates are not live bank or exchange-office prices. Keep that accuracy
  disclosure; review this query after more GSC data accumulates.
- FROTO's live apex page remains self-canonical, indexable, and listed in the
  sitemap, while Google still reports the apex URL as unknown. Google already
  fetched the submitted sitemap; another submission is not supported by the
  evidence. Recheck URL Inspection after a later crawl.
- The previous full sitemap scan found all 175 URLs healthy and no missing or
  mismatched canonical, missing title/description, `noindex`, or H1-count
  problems. After the latest client-cleanup release, all 175 general-sitemap
  URLs were fetched again and returned successfully; no failures were found.

### Revenue and disaster recovery

- Advertising is not producing revenue: no AdSense publisher ID or live ad
  marker was found. Newsletter delivery is also unavailable because
  `RESEND_API_KEY` is absent. These require account credentials and approval;
  no paid service was enabled.
- A verified production dump exists off the VPS on a FileVault-protected Mac
  and the scheduled Mac sync is configured. Its geographic separation is
  unknown, and there is no cloud or immutable backup target.

## Reliability and code quality

- Latest build `l5TkNzH5Ctz3sPmg20qPT` is active with zero restarts. The
  homepage, `/rehber`, `/borsa`, `/doviz`, `/arsiv`, `/kategori/ekonomi`, and
  `/news-sitemap.xml` return HTTP 200; the unauthenticated admin provider
  endpoint returns 401.
- Three public TTFB samples each for `/`, `/rehber`, `/doviz`,
  `/doviz/eur-try`, and `/arsiv` ranged from 0.19 to 0.24 seconds. This is a
  short spot sample, not a field Core Web Vitals result.
- `npm audit --omit=dev --audit-level=high` reports zero vulnerabilities;
  `npm run lint` and `npx tsc --noEmit` pass. The production build generated
  all 300 static pages. No automated test suite was run.
- CI now provisions PostgreSQL 17, matching the production database. The repo
  has `prisma/schema.prisma` and two SQL support files but no Prisma migration
  history; schema changes therefore need a deliberate migration plan before
  production rollout.

## Next evidence-backed actions

1. Keep writer automation and the `$0` cap in place until the user verifies
   provider billing and explicitly chooses a spend limit. Current evidence
   does not support enabling paid generation.
2. Keep collecting GSC data; target work to query/page pairs with real
   impressions and verify each financial claim against primary sources.
3. Ask for AdSense/Resend credentials only if the user wants those revenue
   channels activated. Do not claim ads or a functioning newsletter before
   verifying them live.
4. Add a separately located, preferably immutable backup only after a free or
   affordable destination and retention policy are chosen. Current off-VPS
   copy is real, but its geographic failure domain is unknown.
