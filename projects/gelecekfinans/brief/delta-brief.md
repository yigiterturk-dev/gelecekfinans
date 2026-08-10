# Delta Brief — Operational Relaunch

Version: `2026-08-06.v2`

## Why

The existing automated writer produced repetitive, generic finance articles and the live publication has not published since 19 June 2026.

## Changed surfaces

- topic ingestion and source evidence;
- article generation, verification, persistence and scheduling;
- editorial/admin diagnostics;
- public trust, SEO, consent and ad-readiness details;
- selected recurring-use surfaces where the current architecture supports them.

## Evidence pipeline v3

- RSS items are clustered by story; two independent publisher identities are required before an LLM call.
- The writer uses the Responses API with a required structured schema and claim-level evidence IDs.
- Deterministic numeric, forbidden-language, length and duplicate-paragraph checks run before a separate model verifier.
- A seven-word shingle and longest-exact-run plagiarism gate compares the draft with source summaries and up to 200 articles from the previous 90 days.
- Visual selection is licensed editorial media with recorded license metadata, real market charts where the data is defensible, or a deterministic branded card.
- Synthetic documentary news scenes and unlicensed RSS/stock images are not used.

## Evidence pipeline v4 acceptance

- Direct publisher pages are now inspected for structured `articleBody` evidence; thin RSS snippets alone cannot satisfy the article-depth gate.
- A topic-specific Google News RSS pass searches for corroborating publishers when the broad category feed misses the same event.
- Market opening and closing reports are treated as different event phases. Calendar words and dates no longer inflate unrelated headline similarity.
- Source-derived number matching now safely normalizes Turkish and mixed publisher formats such as `3.8`/`3,8`, `13779.6800`/`13.779,68` and multi-dot turnover values.
- The 280-word quality minimum remains unchanged. Reader-visible summary, impact and FAQ copy is included in the verified editorial word count and plagiarism input.
- The deterministic fallback card moved to the server-bundled image renderer so Turkish text renders consistently in production. The first production card was downloaded and visually inspected after repair.
- Production acceptance run `cmsgygguo0000jm04vm0crvpq` created article `cmsgyh7130002jm042qidb6b4` as a non-public draft with quality score 100, 332 verified words, plagiarism score 100, model verification pass and a visually verified branded cover.
- The draft's evidence list was reconciled after QA: an opening-session result was removed and replaced with same-session closing coverage from Habertürk, Anadolu Ajansı, Bengü Türk and Borsa Gündem. Automatic publication stayed off throughout.

## Claude provider revision

- The article engine now supports both Anthropic and OpenAI through the same structured draft and verification contracts.
- When `ANTHROPIC_API_KEY` is configured, Anthropic becomes the default provider; `ARTICLE_AI_PROVIDER` can explicitly select `anthropic` or `openai`.
- The cost-controlled Claude defaults are `claude-sonnet-5` for article drafting and `claude-haiku-4-5` for independent verification.
- Provider, writer model and verifier model are recorded in each article's automation metadata.
- Billing and missing-key failures are fatal configuration events; they stop the run instead of falling through to unsafe content.
- Local acceptance passed 44 tests, lint and the production build. Anthropic credentials and models are active in production.
- Production acceptance run `cmsgxhd5h0000i5045syg2pb4` authenticated and generated with Claude successfully. Two topics were rejected for insufficient article depth and six were rejected before model use for weak independent evidence; no article was persisted or published.
- The run exposed and led to a fix for Turkish number equivalence (`05`/`5` and `13.703,13`/`13.703`) without relaxing the unsupported-number gate.

## Claude billing visibility revision

- The autonomous newsroom now shows whether the standard Anthropic API key is connected and identifies the active writer and verifier models without exposing any secret.
- The actual prepaid-credit balance and credit purchase flow remain in Anthropic's official Billing page because the standard API key does not expose the remaining balance programmatically.
- The admin panel includes a direct `Bakiye Gör / Kredi Ekle` handoff to the official Claude Platform Billing page.
- An optional, separate `ANTHROPIC_ADMIN_KEY` enables current-month organization cost reporting through Anthropic's Cost Admin API. Individual accounts may not have access to that API.
- The billing status endpoint requires the existing administrator session, disables response caching, redacts upstream errors and never returns either Anthropic key.

## Legacy cleanup

- The legacy inventory contains 76 bot articles: 57 drafts and 19 published records.
- All 19 published records lack a verified evidence packet; 72 of 76 records use legacy AI or untracked stock imagery and 38 are empty shells.
- Cleanup is archive-only and reversible. Original status, publication date and decision are stored under `automationMeta.legacyCleanup`; media files are not deleted.
- On 6 August 2026, all 57 non-public legacy drafts were archived under batch `legacy-gf-2026-08-06-v1`; the post-run audit left exactly 19 published legacy records in scope.
- On 6 August 2026, the verified empty-state build was released and all 19 published records were archived in the same maintenance window. The final batch result is 76 of 76 legacy bot articles archived.
- The user later explicitly superseded the archive-only policy and requested that every legacy article be permanently deleted while preserving only the new Claude article. A guarded production transaction deleted exactly the 76 archived legacy records and verified that one article remained.
- The user explicitly approved the retained Claude article for publication. Article `cmsgyh7130002jm042qidb6b4` is live, is the only remaining article record, and was verified on both its public page and the homepage.
- The user subsequently requested removal of the legacy media as well. A production Blob inventory found 101 objects under `articles/`: one live branded cover referenced by the retained article and 100 orphaned legacy objects totaling 204,741,317 bytes.
- The 100 orphaned objects were permanently deleted under a guarded exact-count check. The retained branded cover is the only remaining `articles/` Blob object and returned HTTP 200 after cleanup.
- Production Blob credentials were pulled only into an exact temporary file for the cleanup and the file was deleted immediately after verification.

## Locked surfaces

- brand name and domain;
- logo, typography, color system and core editorial layout;
- existing market pages and calculator inventory unless a defect requires change;
- Next.js/Prisma/Neon/Vercel architecture.

## User impact

Readers should receive fewer but materially better articles, clearer sources and timestamps, and stronger reasons to return. Administrators should see why an item was accepted, drafted or rejected.

## SEO/GEO growth revision

- General robots metadata now enables full snippets and large image previews; robots.txt advertises both the standard and Google News sitemaps.
- The standard sitemap reads published articles directly, includes their preferred images and omits empty category archives. A separate News sitemap contains only the previous two days and at most 1,000 items.
- Article markup now identifies the canonical page, primary image, publication and modification dates, section, language, newsroom author and NewsMediaOrganization publisher.
- The unsupported homepage SearchAction was removed. Organization, editorial contact, ethics, publishing principles and corrections-policy links now describe only visible, real site behavior.
- Empty category pages are noindexed until they have a published article; market data and calculator pages remain indexable, interconnected utility surfaces.
- New articles receive at least two permanent internal links to the relevant category, market or tool hubs even when no older article exists. Public article pages also expose a visible discovery cluster.
- The About page now explains source verification, AI assistance and corrections. The new `/yayincilik-ilkeleri` page documents evidence, originality, financial, advertising and correction rules.
- Scheduled production remains one candidate per day at 10:00 Europe/Istanbul, now targeting about 650 evidence-supported body words. This is an upper bound, not a quota, and automatic publication remains disabled.
- Production deployment `dpl_DxT9kdxQbdPE6XNiHZ4DyCZtRTyc` passed robots, sitemap, News sitemap, structured-data HTML, desktop and 390px mobile visual checks with zero browser console errors.

## Risks

- stale or unreliable RSS sources;
- hallucinated financial facts or causal claims;
- API/model cost and rate limits;
- duplicate or visually irrelevant articles;
- publishing without adequate consent or ad configuration;
- production branch differing from the active improvement branch.

## Ten-article batch revision

- The admin batch control now executes a requested quantity as isolated one-article production jobs and aggregates their results in the browser. This prevents a ten-item request from exceeding Vercel's 300-second runtime as one monolithic invocation.
- Plain-text runtime failures are parsed safely, and server-aborted `running` records older than six minutes are closed as failed on the next invocation.
- A plagiarism failure receives one evidence-bound full rewrite; deterministic quality, number, verification and plagiarism gates run again unchanged before persistence.
- Recent quality-blocked topics are cooled for six hours. Each small job pulls a wider candidate pool and avoids spending Claude credit on the same recently rejected headline.
- The approved ten-article attempt created three new review drafts: BIST 100 (SEO 93), THY first-half profit (SEO 92) and Koç Holding first-half results (SEO 95). Automatic publication remained off.
- The batch stopped safely when Anthropic returned a billing error. Production now contains five article records: one published article and four drafts. Seven requested new articles remain ungenerated until credit is added.
- Production deployment `dpl_8nda6ATX4perPZhTuhkcfZeREgaw` is live. Local QA passed 47 tests, lint and build; the live article admin passed desktop and 390px DOM checks with zero browser console errors.

## OpenAI cost-guard migration

- The user superseded the active Anthropic route after the 6 August batch consumed USD 4.51. Production article generation now explicitly selects OpenAI even while the legacy Anthropic credential remains stored as an inactive fallback.
- Current official OpenAI model guidance identifies GPT-5.6 Luna as the efficient high-volume family member. Both the writer and independent verifier use `gpt-5.6-luna` through the existing Responses API structured-output contracts with reasoning effort set to `none`.
- Each production job may reserve at most one writer call. A quality, verification or plagiarism failure is blocked without a paid rewrite. The Istanbul-day hard limit is ten writer calls across admin and cron activity.
- Writer output is capped at 2,400 tokens, verifier output at 800 tokens. Evidence sent to the model is capped at 14,000 characters total and 2,500 characters per publisher while deterministic gates retain the full evidence packet.
- Every paid writer attempt is reserved in `AutomationEvent` before the request, including failed attempts, so the daily counter cannot treat rejected drafts as free.
- The admin now displays the active provider, both model roles, daily usage, per-run call limit and token ceilings, with a direct OpenAI Billing handoff. No production generation call was made during migration or QA.
- Production deployment `dpl_Dzv9YUgx9VESLEpY2U6T2dMEtnUe` is live. Local QA passed 53 tests, lint and build; live desktop and 390px checks passed with zero browser console errors.
