# GSC report CLI repair — 2026-11-23

`scripts/gsc-ozet.mjs` parsed `.env.local` itself and signed JWTs with custom
code. The parser did not reliably support dotenv values, and missing or
malformed credentials could fail with an unhelpful runtime error. It also
printed the raw token endpoint error body.

The script now uses the existing `dotenv` and `googleapis` dependencies,
checks for required credentials before authentication, and reports only the
HTTP status or provider error code on failure. The report still reads Search
Console properties and prints the previous/current 28-day totals plus top
queries and pages; it does not write to the database.

Verification: `node --check scripts/gsc-ozet.mjs` and `git diff --check` passed.
No live Search Console request was made, so credential validity and property
access remain unverified.

## Production data recheck — 2026-11-24

The read-only analysis CLI had a second reporting flaw: it mixed all stored
dates, averaged daily positions without impression weighting, and attached a
query's totals to whichever page happened to occur first. It now defaults to
the most recent 28 completed UTC dates, impression-weights average position,
and reports query/page pairs separately. TypeScript, targeted ESLint, and
`git diff --check` passed; no tests were run. The updated CLI was copied to the
server and run against the production read-only query path; no app restart or
Search Console API request was needed.

Stored data through 20 November shows 2,505 impressions and 4 clicks over
28 completed dates (CTR 0.16%). The highest-impression pages are `/doviz/eur-try`
(443 impressions, 0 clicks, weighted average position 72.2) and
`/doviz/usd-try` (382, 4 clicks, position 69.2). The best apparent near miss is
“serbest piyasa dolar” at position 9.7 but only 10 impressions; the page
explicitly labels its Frankfurter value as a daily reference rate, not an
intraday exchange-desk price. “Euro ne kadar” has 20 impressions at position
23.6 and no clicks. These samples do not support claiming that a title change
will lift traffic; broad visibility/ranking is the larger observed gap.
