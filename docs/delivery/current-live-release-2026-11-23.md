# Live release — 2026-11-23

## What changed

Released the pending source improvements for the market pages and market mini,
search loading and keyboard access, Turkish search matching, archive pagination,
consent controls and disclosures, cover-image handling, and the new
`/araci-kurumlar` and `/halka-arz` guides. BIST pages now include TradingView
charts. AI writer paths retain the disabled automation and human review gates.

TypeScript found a missing false branch in `/faiz`'s conditional JSX; it was
fixed before release. `git diff --check` and TypeScript passed. The isolated
production build compiled, completed TypeScript, and generated 296 static pages.
No tests were run.

## Spend and database safety

The build ran in an isolated release directory with `AI_AUTOMATION_ENABLED=false`
and OpenAI, DeepSeek/Gemini API keys blanked in the build process. Static page
generation read the production database; it did not run a model generation
path. No database write or schema migration was part of the release.

The read-only 14-day cost ledger has 82 runs and 938 recorded model calls:
746 `gemini-2.5-flash`, 100 `deepseek-v4.1-flash:cloud`, 56 `gpt-5-mini`, and
36 `gpt-5-nano`. The app's OpenAI price table estimates $0.5013 for the 92 GPT
calls; this is not an invoice or proof of the current account balance. Google
token usage is 1,199,079 input and 1,092,853 output tokens. At Google's current
paid standard text rates and without cached-input discounts, that would be
about $3.09; Google also lists a free tier, so the account's real charge could
differ. The DeepSeek model label includes `:cloud` and does not match the
official model identifier, so no vendor price was assigned. The configured
OpenAI key still returns quota errors, while the OpenAI costs endpoint returns
403; available balance remains unknown. The news and guide timers are now off.

Google's current pricing page says `gemini-2.5-flash` is deprecated and will
route to Gemini 3.5 Flash-Lite from 2026-12-01. Automation stays off until this
route, its billing tier, and the intended model are checked.

Pricing sources reviewed on 2026-11-23: [OpenAI API pricing](https://developers.openai.com/api/docs/pricing),
[Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing), and
[DeepSeek Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/).

## Content-audit guard and usage report

The read-only legacy-article audit initially marked all 155 BOT drafts/published
articles as lacking evidence because it accepted only `gf-evidence-v3`; the live
pipeline now records v5. The predicate now trusts `verifiedEvidence=true`
independently of pipeline version. The corrected dry run flags 43 items (42
published, 1 draft) that actually lack that marker. **No article was archived.**
Of 154 published BOT articles, 112 have the verification marker and 42 do not;
those 42 remain an editorial review queue, not a batch archive instruction.
The public URL and recorded source metadata are listed in
`legacy-article-review-queue-2026-11-23.md`.

A follow-up read-only inspection found that 41 of the 42 unverified published
articles contain at least one HTTPS link in their body; 10 have a visible
`Kaynaklar` section. Across all 154 published BOT articles, 122 have that
section and 153 contain an HTTPS link. The lone unverified article without a
visible source heading or HTTPS body link is the first review priority. The
updated queue lists link hostnames; these links still need claim-level review.

The production `scripts/maliyet.ts` CLI now prints input/output token totals by
model, making the 846 unpriced Gemini/DeepSeek calls visible by model volume.
Its 14-day report is read-only. TypeScript and `git diff --check` passed after
these CLI changes; no test suite was run.

The article author box previously claimed every story had two independent
sources and an originality check. That blanket statement was unsupported for
the legacy queue, so it now links readers to the source, correction, and review
policy without making a universal claim. Build `uXsyLr-wo6tmqmxQT5UAF` is live;
the affected article returned HTTP 200 with the new copy, and the service is
active with zero restarts. Rollback snapshot:
`/root/gf-release-before-author-wording-20261123`.

The `/hakkimizda` and `/yayincilik-ilkeleri` pages had similar blanket claims:
that all old articles carried visible source lists and the same two-source
checks. A read-only check of seven legacy guide pages found no visible
`Kaynaklar` heading. Copy now distinguishes the current bot-draft standard
from legacy content and repeats that old sources may be absent and some bot
stories were not individually reviewed by a human. Build
`SMKj88Pgs8FCEKN08Eisp` is live; both pages return HTTP 200 with the updated
copy. The 23 Nov 04:07 CET database dump restored in an isolated, networkless
PostgreSQL 17 container (14 tables, 214 articles) before deployment. Rollback
snapshot: `/root/gf-release-before-editorial-policies-20261123`.

Before release, `/opt/gelecekfinans-db/yedek/gf-20261123.dump` restored in a
network-disabled PostgreSQL 17 container with `--exit-on-error`: 14 tables,
214 articles, and 5,526 automation events. The live database was not used for
the restore test.

## Production evidence

- The initial feature build `7f5yInyJk_lwRUNUrZYxH` was superseded by author
  copy build `uXsyLr-wo6tmqmxQT5UAF` and policy copy build
  `SMKj88Pgs8FCEKN08Eisp`. The latter is current; systemd reports
  `Result=success`, `NRestarts=0`.
- `AI_AUTOMATION_ENABLED=false`; news and guide timers are inactive.
- `/`, `/borsa`, `/doviz`, `/faiz`, `/araci-kurumlar`, `/halka-arz`, `/yazarlar`,
  `/yayincilik-ilkeleri`, both privacy pages, `/arsiv?sayfa=8`, and both sitemaps
  returned HTTP 200. One-request TTFB observations were 0.20–0.33 seconds.
- Unauthenticated `/api/admin/ai-provider` returned HTTP 401.
- Rollback snapshots exist for each release; the immediate pre-policy build is
  `/root/gf-release-before-editorial-policies-20261123`.

This release was superseded on 23 November by the zero-dollar AI spend-guard
build `Jy190-BRtkdu_ky3TJcAw`. The current build is active with zero service
restarts; production remains `AI_AUTOMATION_ENABLED=false` and now explicitly
sets `AI_DAILY_SPEND_LIMIT_USD=0`. Home, calculator index, gold API, and crypto
API returned HTTP 200; the unauthenticated AI-provider admin endpoint returned
401 as expected. The full cost-guard evidence and rollback location are in
`ai-cost-audit-2026-11-23.md`.

That build was superseded the same day by persistent, atomic per-call spend
reservations in build `Kth3tgbUKkwO9RelGittD`. That build passed follow-up
health checks with zero service restarts. Its rollback snapshot is
`/root/gf-release-before-persistent-reservation-20261123`.

On 23 November, build `Bc4Ni0lVzFCyfZzywA4Z6` corrected quota attribution:
quota-like errors from non-OpenAI providers no longer claim to be OpenAI errors,
and new records retain the selected provider, endpoint hostname, vendor code,
and HTTP status. Only OpenAI failures use the OpenAI cooldown. The isolated
build used blank AI keys, automation off, and a $0 daily cap; TypeScript,
targeted ESLint, and 300-page generation succeeded. The active service has zero
restarts, the home page returns 200, and the unauthenticated admin API returns
401. Rollback snapshot: `/root/gf-release-before-provider-quota-fix-20261123`.

Temporary build directories were removed after retaining rollback snapshots.
Account balance is still unknown: the configured key could not read the OpenAI
organization-cost endpoint (HTTP 403).

On 24 November, build `nxYXLgDpiFrugHHlT9yzM` made retained evidence entries,
safe source links, blocked-by codes, and review objections visible in the bot
dashboard. The isolated production-source build passed TypeScript and generated
all 300 static pages with AI automation disabled, model keys blank, and the
daily spend cap at `$0`. The live service is active with zero restarts; the
homepage returns 200 and the unauthenticated admin provider endpoint returns
401. Rollback snapshot: `/root/gf-release-before-dashboard-evidence-20261124`.

Later on 24 November, build `jvu0X3PPmg5VyZ7qklUVp` added historical current-
tariff comparisons and durable model-call reservation attribution to the
read-only cost report, and added the Gemini 3.5 Flash-Lite price to the spend
guard. It includes the dashboard evidence details above. TypeScript and the
300-page production build passed with model keys blank, automation off, and the
daily spend limit at `$0`. The live service was checked after deployment.

Build `rEH0A-zJZaLV0A9Yqh_kM` then added the historical standard-tariff
comparison and the 30-day durable reservation amount/count to the admin cost
card. TypeScript and the 300-page production build passed; AI automation remains
off with a `$0` cap. Post-deploy, the service is active with zero restarts,
home returns 200, and unauthenticated admin endpoints return 401. No model
calls or tests were run. Rollback snapshot:
`/root/gf-release-before-admin-historic-costs-20261124`.

Build `Egw_g8jZU7cPxXj0r_vow` then corrected the legacy quota wording shown in
the admin run/error history and operational status script: quota/limit evidence
no longer claims that the OpenAI balance is definitely zero. Production remains
on the Gemini endpoint with automation off and daily spend `$0`. TypeScript and
300-page build passed; service active, zero restarts, home 200, admin API 401.
No model calls or tests were run. Rollback snapshot:
`/root/gf-release-before-quota-history-panel-20261124`.

Build `j8cNlSJhf9NDWJdY0rPLK` deployed provider billing-error attribution.
The service now runs from `/opt/gf-stage-dashboard-20261124c`, the same root
used to create its Turbopack build, and shares uploaded article images with
`/opt/gelecekfinans/public/gorseller`. The app uses the production environment
file at `/opt/gelecekfinans/.env.production`; model automation is off and the
daily spend limit is `$0`. The service is active with zero restarts. Home,
`/borsa`, `/doviz`, a published article, and the news sitemap return 200; the
unauthenticated provider endpoint returns 401. OpenAI balance remains
unverified. Rollback materials are
`/root/gf-release-before-billing-error-attribution-20261124` and
`/etc/systemd/system/gelecekfinans.service.d/20-release.conf`.

Build `cfrpjoK7lSduvjowGm68f` adds title and combined-text similarity scores
and the active thresholds to future corroboration-judge events. This is
diagnostic metadata only; the prompt, 0.20 gray-band threshold, two-source
gate, and AI-off setting are unchanged. TypeScript and the production build
passed with provider keys blank and the daily cap at `$0`. Home, `/borsa`,
`/doviz`, the news sitemap, and a published article return 200; the
unauthenticated provider endpoint returns 401. The service is active with zero
restarts. The source tree and `.next` build stay in the same path so Turbopack
resolves correctly; uploaded images remain shared at
`/opt/gelecekfinans/public/gorseller`. Rollback snapshot:
`/root/gf-release-before-judge-similarity-20261124`.

Build `9OJf4N5gEncqj12eQsglM` now records corroboration judgments as matched,
different, or not evaluated. Disabled automation, budget skips, and provider
failures carry separate reasons, so they are no longer counted as model
rejections. The two-source publication gate, 0.20 gray-band threshold, and
model prompt are unchanged. TypeScript and production build passed with model
keys blank, automation off, and the daily cap `$0`. Home, a published article,
market pages, and the news sitemap return 200; the unauthenticated provider
endpoint returns 401. The service is active with zero restarts. Rollback:
`/root/gf-release-before-tristate-judge-20261124`.

The 24 November backup check found that `gf-20261121.dump` was zero bytes even
though the prior job status had appeared successful. The live backup script now
writes to a protected temporary file, checks that it is non-empty, validates
the custom archive with `pg_restore --list`, and atomically replaces the daily
file only after validation. A fresh 1,284,691-byte dump was restored with
`pg_restore --exit-on-error` in a network-isolated PostgreSQL 17 container;
the restore contained 14 public tables and 214 articles. The production service
remains active and the homepage returns HTTP 200. No model calls were made.

Build `NmAy2I1FijLqInPpKTww4` adds the verified Netcup hosting provider and
Karlsruhe address to the Künye page's existing contact section, linked to
Netcup's official legal notice. The production build generated all 300 static
pages with AI automation disabled and the daily cap at `$0`; no model calls
were made during the build or deploy. Before restart, the fresh
1,284,691-byte production DB dump passed `pg_restore --list` and restored
successfully in a network-isolated PostgreSQL 17 container (14 public tables,
214 articles). After restart, the service is active with zero restarts; home
and Künye return 200, the unauthenticated AI-provider endpoint returns 401,
and the shared article image directory remains mounted. The publisher's legal
name, business address, phone, and UETS address still need owner confirmation;
no missing values were fabricated. AI remains disabled with a `$0` daily cap.

Build `dHe-K8hH8cG3r89xpBLlg` also fixes a legacy admin-reporting ambiguity.
The production database has eight published BOT rows with `sourceScore=0`; the
source-scoring function's minimum is 35, so zero is an old unscored sentinel,
not a measured zero-quality result. The bot dashboard now renders those values
as unknown. No article rows were changed. TypeScript and the 300-page production
build passed; after restart the service is active with zero restarts, home and
Künye return 200, and the unauthenticated provider endpoint returns 401. The
AI automation remains off with a `$0` daily cap. The pre-deploy database dump
restored in an isolated PostgreSQL 17 container.

Build `ulxzPfilH68W690Hs4pa5` adds a narrowly gated title signal to the
corroboration gray-band candidate screen. A title can lift a candidate above
the existing 0.20 floor only when title similarity is at least 0.40 and token
Jaccard overlap is at least 0.20. In an RSS-only 30-feed snapshot (350 finance
candidates, 311 topics), this found the TRT report on the BDDK credit-card
decision while adding 3 candidate pairs and 1 newly eligible topic versus the
old rule (171/420 → 172/423). The two-source publication gate and 0.20 combined
text floor are unchanged. The known SGK pair remains below the new title gate;
lowering the global floor would raise candidate pairs by roughly 25% in the
earlier production-host measurement. This diagnostic made no model calls.

The isolated Next.js build generated all 300 static pages with model keys blank,
AI automation disabled, daily spend `$0`, and the build DB connection forced
read-only. A fresh 1,275,894-byte database dump passed `pg_restore --list`
before activation. Production now runs from
`/opt/gf-stage-title-rescue-20261124a`; the service is active with zero
restarts, home, `/borsa`, `/doviz`, `/rehber`, `/kunye`, and the news sitemap
return 200, and the unauthenticated provider endpoint returns 401. Runtime AI
automation remains `false` with a `$0` cap, and no model calls were made.
Rollback snapshot: `/root/gf-release-before-title-rescue-20261124`.


Build Txz54tFpmC0CUfJTDVPdP adds a Turkish pension-wording rescue for the
corroboration prefilter and records each candidate's selection reason and
similarity signals in future judge events. The supplemental signal normalizes
emekli, aylık/maaş, and kesilme wording, then appends qualifying publishers
after existing candidates without replacing them. In the latest 30-feed RSS
snapshot, this recovered the SGK control-examination pair with 2 extra pairs
across 1 newly eligible topic. The source still goes to the same-event judge;
the two-publisher publication gate and global 0.20 floor are unchanged.

The isolated build generated all 300 static pages with provider keys blank,
automation disabled, spend cap $0, and the database connection forced
read-only. A fresh 1,275,894-byte database dump passed pg_restore --list.
After activation the service is active with zero restarts; /, /borsa, /doviz,
/rehber, /kunye, and /news-sitemap.xml return 200, and the unauthenticated
provider endpoint returns 401. The configured provider still resolves to
Gemini; AI remains disabled with a $0 cap. No model calls were made. Rollback
snapshot: /root/gf-release-before-sgk-event-rescue-20261124.


Build E1EpMYBPbTN6mlpU2pW46 adds Turkish suffix stemming to the article
duplicate guard and runs the check before same-event judge requests. A read-only
live RSS query returned four Karahan statement variants in the first five
topics. The previous guard already caught two of the three alternates; it
missed the title that used inflected forms of Karahan, enflasyon, and rezerv.
The updated guard catches all three while leaving an unrelated rice-export
story distinct. No model call was made during the RSS probe or direct check.
This can skip a redundant judge request before the writer is reached.

The isolated production build generated all 300 static pages with model keys
blank, automation disabled, daily spend $0, and the database connection forced
read-only. A fresh 1,275,894-byte database dump passed pg_restore --list.
After activation the service is active with zero restarts; /, /borsa, /doviz,
/rehber, /kunye, and /news-sitemap.xml return 200, and the unauthenticated
provider endpoint returns 401. Gemini remains configured, AI remains disabled
with a $0 cap, and no model calls were made. Rollback snapshot:
/root/gf-release-before-repeat-guard-20261124.

Build 5GSD6fGWHLFg7YXjbFQze fixes the category and archive 500s caused by
cached Prisma timestamps returning as strings. Article view-model mapping now
accepts both Date objects and ISO date strings for created/updated timestamps.
The production stack trace was `(a.publishedAt || a.createdAt).toISOString is
not a function` across five `/kategori/*` URLs.

The isolated build generated all 300 static pages with model keys blank,
automation disabled, daily spend `$0`, and its database connection read-only.
A fresh 1,279,554-byte database dump passed `pg_restore --list`. In the stage
server, all five affected category pages and `/arsiv` returned 200 on both
cold and cached requests. After release, all 175 URLs listed in the general
and news sitemaps returned 200, with no missing, mismatched, or noindex
canonical metadata. The service is active with zero restarts; the unauthenticated
provider endpoint returns 401. AI automation remains off with a `$0` cap; no
model calls were made. Rollback snapshot:
`/root/gf-release-before-category-date-cache-20261124/20-release.conf`;
previous build: `/opt/gf-stage-repeat-guard-20261124a`.
