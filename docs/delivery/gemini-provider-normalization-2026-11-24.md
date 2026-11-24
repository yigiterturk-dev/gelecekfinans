# Gemini provider normalization — 24 November 2026

## Change

Production used a Google Generative Language endpoint and gemini-2.5-flash,
but the app labeled that route deepseek because it shared the DeepSeek
OpenAI-compatible client. A quota response could therefore be recorded under
the wrong provider name.

The writer now supports Gemini as an explicit provider and recognizes the
existing legacy configuration as Gemini when the old endpoint or model is
Google Gemini. It preserves the current key, URL, model names, temperature, and
reasoning settings; no production credentials were changed. The admin status
labels Gemini correctly, the cron preflight accepts a GEMINI_API_KEY for a
future explicit Gemini configuration, and Gemini errors are attributed to
Gemini. The normal OpenAI opt-in guard and application dollar-spend guard are
unchanged.

## Verification and release

- Local TypeScript passed. A direct configuration smoke check resolved the
  legacy DeepSeek-named Google endpoint to gemini with both Gemini 2.5 Flash
  models; the model price table returned a priced result.
- A fresh production database archive was verified before release:
  /opt/gelecekfinans-db/yedek/gf-20261124.dump, 1,284,691 bytes, mode 600.
- The isolated production-source build compiled, completed TypeScript, and
  generated all 300 static pages. AI automation was forced off and the daily
  spend cap was forced to $0 for the build.
- Build m3mwytVSTviqYmQw7yHb is live from
  /opt/gf-stage-gemini-provider-20261124a. The application resolved the
  production environment to provider gemini, writer and verifier
  gemini-2.5-flash, and endpoint generativelanguage.googleapis.com.
- Automation remains false, daily spend remains $0, the service is active
  with zero restarts, /, /borsa, /doviz, /rehber, /kunye, and the news sitemap
  return HTTP 200, and the unauthenticated provider endpoint returns HTTP 401.
  No model API call or test suite was run.
- Rollback snapshot:
  /root/gf-release-before-gemini-provider-20261124/20-release.conf.
  Previous build: /opt/gf-stage-source-score-20261124a.

## Limits

This corrects provider selection and future error attribution. It does not
reconstruct which vendor produced legacy quota events or establish any account
balance. The OpenAI account balance remains unknown to the application.
