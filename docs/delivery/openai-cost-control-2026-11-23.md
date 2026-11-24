# OpenAI cost control — 2026-11-23

## Production usage observed

A read-only query of production `AutomationEvent` cost records for the rolling 24 hours ending 2026-11-23 04:52 UTC found four cost events:

- `gpt-5-mini`: 18 calls, 59,103 input tokens and 129,426 output tokens; application estimate **$0.271698**.
- `gpt-5-nano`: 18 calls, 6,873 input tokens and 1,667 output tokens; application estimate **$0.001011**.
- Total: 36 recorded OpenAI model calls; **$0.272709 estimated by the site's token-price table**.

This is an internal estimate, not an OpenAI invoice or remaining-credit balance. The app's cost table may differ from account billing. Six production events in that same 24-hour window were categorized `OPENAI_QUOTA_EXHAUSTED`; the old handler also used this code for quota-like errors from non-OpenAI providers, and those events did not retain provider or vendor subcode. They indicate blocked API requests but do not prove OpenAI was the provider, nor whether any account had zero prepaid credit or hit another usage/spend limit. The separate `BUDGET_LIMIT` cron result is the site's own daily writer-call cap: the news job added 0 articles and marked 5 blocked. The guide job timed out.

The OpenAI organization-cost endpoint returned HTTP 403 to the application's project key in a previous check, so the account balance cannot be read from this server. OpenAI documents API billing as separate from ChatGPT billing and directs API owners to the API Billing overview and Analytics > Usage.

## Current production safeguards

- `AI_AUTOMATION_ENABLED=false`; `ARTICLE_AI_PROVIDER=deepseek`.
- An OpenAI key is configured, but it is not the selected provider while the explicit provider is DeepSeek and automation is off.
- News and guide timers are inactive. The active image job uses the site's deterministic chart/brand-card path and stock-media search, not an OpenAI image model; the licensed custom-media endpoint is not configured.
- `lib/bot/writer.ts` now requires an explicit provider whenever AI automation is enabled. `ops/gf-cron.cjs` refuses news/guide work when the provider or its matching key is missing instead of inferring OpenAI from key presence. `.env.example` no longer selects OpenAI by default.
- The provider guard is live in build `mJaU4ViQt225B32nkD21I`. The isolated build used blank OpenAI/DeepSeek/Anthropic keys and `AI_AUTOMATION_ENABLED=false`; it compiled TypeScript and generated 296 static pages. No tests were run. The production service is active with zero restarts.

The quota error attribution was corrected in later build `Bc4Ni0lVzFCyfZzywA4Z6`: only actual OpenAI quota failures keep the legacy OpenAI code/cooldown; other providers now use `AI_PROVIDER_QUOTA_EXHAUSTED` and record the selected provider, endpoint hostname, vendor code, and status. Historical quota events did not preserve those fields and cannot identify which provider failed. Build verification used blank AI keys, automation off, TypeScript plus targeted ESLint, and 300 static pages; production home returned 200 and unauthenticated admin API returned 401. Rollback snapshot: `/root/gf-release-before-provider-quota-fix-20261123`.

No OpenAI API call was made by this agent during this work. The remaining account balance must be checked in the OpenAI Platform API Billing overview; usage and credit grants are separate account views. The current balances are unknown from this session.

## Live recheck — 2026-11-23 06:36 UTC

- Production env still has `AI_AUTOMATION_ENABLED=false`. `ARTICLE_AI_PROVIDER=deepseek`, while its configured endpoint is `generativelanguage.googleapis.com` and its writer/verifier models are `gemini-2.5-flash`. An OpenAI key is present, but OpenAI is not the selected provider.
- Systemd has no active news or guide writer timer. Active timers observed: image repair, index ping, GSC sync, hit measurement, backup, and `gf-nobet`. Image repair uses deterministic local cards/charts and licensed media lookup; no image-model call was found. The `gf-nobet` orchestrator checks the off switch before LLM calls.
- The latest production `cost` event remains 22 Nov 22:06 CET. In the last 24 hours, the only later event was a newsletter preflight warning; no new model cost event was recorded. This is app-ledger evidence, not an account invoice.
- OpenAI's account balance and the exact cause of the 21–22 Nov quota failures remain unverified from the server. No OpenAI API call was made during this recheck.
