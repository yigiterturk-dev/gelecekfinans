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
