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

To rule out an indexing failure on the main examples, the Search Console URL
Inspection API was queried read-only for the EUR and USD pages and the
Bitcoin-purchase guide. All three returned `PASS` / `Submitted and indexed`,
`INDEXING_ALLOWED`, and matching Google/user canonicals. Their last crawls were
23 Nov (EUR), 22 Nov (USD), and 11 Nov (Bitcoin guide). This sample confirms
these pages are indexable; it does not prove all sitemap URLs are indexed.

### FROTO canonical discrepancy — 2026-11-24

Read-only URL Inspection found a separate stale-state issue for `/borsa/froto`:
Google reports the `www` URL as indexed and chooses its `www` URL as canonical,
while the inspected apex URL is unknown to Google. The live `www` route
redirects to apex, the apex sitemap lists FROTO, and the current page declares
the apex canonical. A production database scan found no article content
containing `www.gelecekfinans.com`, so stale internal article links do not
explain the discrepancy. Search Console data has 123 impressions and no clicks
for this page from 10 October through 20 November. This points to a stale Google
index/canonical record; it does not establish a live redirect or sitemap
defect. Recheck URL Inspection after Google recrawls the apex URL.

### FROTO reinspection and sitemap resubmission — 2026-11-23 21:49 UTC

The public site still redirects `www.gelecekfinans.com/borsa/froto` to the apex
URL, lists the apex URL in `sitemap.xml`, and serves the apex self-canonical.
Search Console inspection now reports the apex URL as `Discovered - currently
not indexed` (no crawl/canonical yet). The `www` URL remains indexed with a
Google-selected `www` canonical, last crawled 9 October, while the page's user
canonical is apex.

Search Console's sitemap report showed the general sitemap last downloaded
20 November and the news sitemap last downloaded 23 November; both had zero
warnings/errors. The general apex sitemap was resubmitted at 21:49:25 UTC. The
immediate response shows `isPending=true`, zero warnings, and zero errors; its
`lastDownloaded` timestamp had not changed yet. This requests a fresh sitemap
fetch but does not guarantee crawl or indexing. Recheck the URL Inspection
result after the pending fetch completes. No model API was called.

Recheck after submission: Google downloaded the general sitemap on
23 November at 21:49:26 UTC (about one second after submission). `isPending`
returned false and warning/error counts remained zero. The FROTO apex inspection
still returned `Discovered - currently not indexed`, with no crawl time or
Google canonical. Sitemap delivery is now confirmed; indexing has not yet
changed. Avoid repeated submissions while waiting for Google to crawl the URL.

### FROTO status recheck — 2026-11-24 07:41 TRT

One read-only Search Console URL Inspection request still reports the apex
FROTO URL as `URL is unknown to Google`. The live page returns successfully,
declares `index, follow`, has the apex self-canonical, and remains present in
the apex sitemap. `robots.txt` does not disallow `/borsa`. The visible page
signals therefore do not show a site-side indexing block. The sitemap was
already fetched successfully after its prior submission; do not submit it again
while waiting for Google to discover/crawl this URL. No model API was called.

### Search demand and metadata sweep — 2026-11-24

The read-only 28-day Search Console window (25 Oct–21 Nov) shows
`/doviz/usd-try` at 420 impressions, 4 clicks, average position 68.2, and
`/araclar/mevduat-faiz-hesaplama` at 92 impressions, 0 clicks, position 66.7.
The latter's visible queries are also mostly below position 40; its largest
query examples are “anapara faizi hesaplama” (9 impressions, position 79.2)
and “faiz getiri hesaplama” (8 impressions, position 92.1). The page title
already contains “Mevduat Faizi Hesaplama” and the result does not show a
title-only fix supported by this low-ranking sample. Ranking/discovery is the
larger measured gap.

A separate live metadata scan of all 175 general/news sitemap URLs found no
duplicate titles, missing titles/descriptions, missing or mismatched
canonicals, `noindex` pages, HTTP failures, or pages with other than one H1.
The character-count screen flagged 108 titles over 70 characters and 11
descriptions over 170; those lengths are review cues, not proof of a defect,
so no bulk title shortening was applied. No model API was called.
