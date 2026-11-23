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

Temporary build directories were removed after retaining rollback snapshots.
Account balance is still unknown: the configured key could not read the OpenAI
organization-cost endpoint (HTTP 403).
