# Zero-spend AI gate — 2026-11-23

## Production state

- `AI_AUTOMATION_ENABLED=false`; no news or guide publishing timer is active
  (the news timer unit is absent, and the guide timer is disabled).
- `POST /api/admin/research` called `writeArticle` directly and bypassed the
  shared orchestrator gate. It now checks the same switch before research or
  any writer call. The change is in
  `app/api/admin/research/route.ts`.
- Other `writeArticle` call sites are the news and guide orchestrators, which
  already stop before provider configuration when the switch is off.
- The model provider remains configured as OpenAI (`gpt-5-mini` writer,
  `gpt-5-nano` verifier); the explicit off switch keeps those keys unused by
  automated writing.

## Release evidence

- Production build: `870RXvGyk4JWCaOMEmrJv`; service active after restart.
- Live source SHA-256 matches the gated route in this worktree.
- The live build source map contains the admin route's switch check and
  fail-closed message.
- Public homepage returned HTTP 200. Unauthenticated admin research POST
  returned HTTP 401 without invoking the writer.
- The cost ledger still showed the same four recent runs after deployment;
  no new AI usage event appeared during the investigation or release.
- The 14-day ledger contains 746 `gemini-2.5-flash` calls (9–17 Nov; 1,199,079
  input and 1,092,853 output tokens) and 100 `deepseek-v4.1-flash:cloud` calls
  (19–20 Nov; 287,100 input and 220,831 output tokens), both still unpriced.
  Start-event metadata attributes 572 Gemini calls and 61 DeepSeek calls to
  the `deepseek` adapter; the other 213 calls have no provider on their legacy
  start record.
- The 12 Nov environment backup selected `gemini-2.5-flash` and routed the
  DeepSeek-compatible client to Google's `generativelanguage.googleapis.com`
  OpenAI-compatible endpoint. This identifies the configured route at that
  snapshot, not the exact account invoice for every call. The historical
  endpoint for the later `:cloud` model is not recorded, so its billing source
  remains unknown.
- The production `scripts/maliyet.ts` report now joins run-start provider data,
  labels unpriced calls as unknown instead of `$0`, and suppresses a monthly
  cost projection when the total is incomplete. Its 14-day known-cost lower
  bound remains $0.5013 for 92 calls through the OpenAI adapter (214,723 input
  and 231,314 output tokens); this is application usage data, not an invoice.
- Before deployment, dump
  `/var/backups/nocturn/gelecekfinans/gelecekfinans-20261123-000918.dump`
  (1,323,229 bytes) restored successfully with `pg_restore --exit-on-error`
  in an isolated PostgreSQL 17 container with networking disabled: 14 tables,
  214 Articles, and 5,526 AutomationEvents.

The application ledger is not a provider invoice. The Gemini API account's
actual billing and the later DeepSeek Cloud route's billing remain unverified.
Automatic article generation stays disabled until those costs and a
user-approved spend limit are clear.

## Follow-up: Gemini configuration restored (2026-11-23)

- The production provider values were later restored from the 12 Nov snapshot:
  `ARTICLE_AI_PROVIDER=deepseek`, model `gemini-2.5-flash`, and the
  OpenAI-compatible Google Generative Language endpoint. The application
  calls this adapter `deepseek`; the admin provider panel identifies the
  configured Google endpoint as Gemini.
- `AI_AUTOMATION_ENABLED` remains `false`. No Gemini or OpenAI generation was
  used to restore or verify these settings. The Google account's free/paid
  tier and available balance remain unknown.
- Current active timers include image repair, GSC sync, index ping, hit
  measurement, backups, and `gf-nobet`. News and guide generation timers are
  inactive. Image repair uses local deterministic charts/cards and licensed
  media lookup; it does not call the text/image model provider. `gf-nobet`
  exits before any LLM request while automation is off.
- Recent failure evidence: the 402 responses are dated 18–19 Nov; the
  OpenAI quota exhaustion messages are dated 21–22 Nov. The account balance
  cannot be inferred from either application's error logs or usage ledger.
- Follow-up live check: homepage, `/rehber`, `/doviz`, `/doviz/usd-try`,
  `/borsa`, `/altin`, and `/kripto` all returned HTTP 200; measured TTFB was
  0.21–0.29 seconds. The latest `gf-yedek` run succeeded and a fresh 1.32 MB
  database dump exists from 23 Nov 01:28 CET.
- A repository-wide search found model-writing entry points only in the
  orchestrators, the gated admin research route, and two CLI scripts. The
  article/guide orchestrators and admin route check the zero-spend switch;
  `fill-articles.ts` already checks it, and `sayfa-kurtar.ts` now checks it
  before its direct writer call. Root cron and systemd schedules contain no
  GelecekFinans writer job outside the known news/guide timers, which are
  inactive.
- The latest `AutomationEvent` with stage `cost` is dated 22 Nov 22:06 CET;
  no later cost-ledger entry appeared in the read-only check. This ledger only
  records calls that return token usage, so it is corroborating evidence, not
  provider billing proof.
- A 402 response from any model provider is now classified as a fatal billing
  error. The OpenAI-compatible Gemini/DeepSeek path no longer retries that
  same failed request three times; optional judge/entity catches propagate
  the fatal error so the current writer run stops instead of advancing through
  more topics. One-off article batches also stop on provider-fatal errors.
- Deployed as build `BWpnRIBBZJq8KguSq_QP3`. Production TypeScript/build checks
  passed; homepage, `/rehber`, `/doviz`, and `/doviz/usd-try` returned HTTP 200
  after restart, and unauthenticated `/api/admin/ai-provider` returned 401.
  News/guide automation remains false. Fresh backup
  `/opt/gelecekfinans-db/yedek/gf-20261123.dump` was restored successfully in
  an isolated PostgreSQL 17 container (214 articles, 14 tables) before deploy.
  Rollback source and build are under `/root/gf-release-provider-402-20261123`.
- Newsletter delivery is currently unavailable: `RESEND_API_KEY`,
  `NEWSLETTER_SECRET`, and `ALERT_EMAIL` are absent. `/api/site-config`
  confirms no AdSense publisher ID is configured, and `/ads.txt` returns 404
  for that reason. The newsletter
  form now renders a clear closed notice instead of collecting addresses that
  cannot receive email. Build `nQC8vam8eh2De48uiLWw6` is live; homepage and
  `/kategori/ekonomi` return HTTP 200 with the notice and without the email
  input. The fresh database dump was restored again (214 articles, 14 tables)
  before this release; rollback material is under
  `/root/gf-release-newsletter-state-20261123`.
- GSC service credentials and `GSC_SITE_URL` are set; news and guide timers
  remain inactive. A read-only GET to OpenAI's organization-cost endpoint
  using the configured project key returned HTTP 403, so the provider account
  balance could not be read. No generation endpoint was called.
- Review-gate audit found 134 currently published BOT articles with
  `autoPublished=true` (and 8 archived BOT articles with that flag). The
  `SiteSettings.autonomy.enabled` value was absent, so the previous
  `DEFAULT_SETTINGS` value `true` enabled auto-publishing if a bot run started.
  The default is now false; news, guide, generate, image-repair, and repair
  script paths all force review. The admin toggle was removed, and the public
  author/publishing pages now disclose that some past bot articles were not
  individually reviewed by a human editor. Existing articles were retained.
- Review-gate build `8_C-9-nd2nLTVMvyCUFOt` is live and service result is
  success. The setting panel defaults both cron and auto-publishing off. The
  public `/yazarlar` and `/yayincilik-ilkeleri` pages return 200 with the new
  disclosure. The 23 Nov 02:09 CET DB backup restored successfully in an
  isolated PostgreSQL 17 container (214 articles, 14 tables); rollback is at
  `/root/gf-release-review-only-20261123`.
- Search Console currently has 2,092 impressions/4 clicks over 28 days and
  4,446 impressions/7 clicks over 90 days; latest imported date is 19 Nov.
  The 90-day page averages are mostly positions 70–90. Only five query/page
  pairs with at least five impressions sit at positions 5–20, each with 5–10
  impressions. GSC sync failed on 21 Nov and succeeded on 22 Nov; the data
  import lag is consistent with its normal reporting delay.

## Direct writer entry-point guard (2026-11-23)

- A fresh call-site inventory found that `scripts/varlik-gecmis.ts --uygula`
  could invoke `extractEntities()` directly. The script's explicit apply flag
  was its only spend gate; it did not honor `AI_AUTOMATION_ENABLED=false`.
- The writer module now enforces the switch at its paid entry points:
  `writeArticle()` fails closed, while `extractEntities()` returns no results
  and `judgeSameStory()` skips the optional model judgment. This protects
  future callers as well as the current script and orchestrators.
- The CLI also refuses `--uygula` while automation is disabled, with an
  explicit message before reading the candidate set.
- Static call-site review found no other provider-call functions in
  `lib/bot/writer.ts` outside those guarded paths. Tests and build were not run
  in this iteration.

## Live recheck — 2026-11-23 06:36 UTC

Production configuration was read without printing secret values: automation is off; the selected `deepseek` adapter points to Google Generative Language and Gemini 2.5 Flash. The OpenAI key is present but unselected. No news/guide timers are active; the active image repair path is deterministic/licensed-media only. The latest recorded model-cost event is still 22 Nov 22:06 CET; after that, the 23 Nov newsletter cron stopped at the missing-mail configuration preflight. This verifies the site's current zero-spend controls, not provider account credit.
