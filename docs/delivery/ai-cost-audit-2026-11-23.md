# GelecekFinans AI cost audit — 2026-11-23

## Findings from production

Read-only production configuration and `AutomationEvent` records were inspected on 23 November 2026. No model API calls were made for this audit.

- `AI_AUTOMATION_ENABLED="false"`; the scheduled article-writing automation is off.
- The application recorded 90 cost events and 1,071 model calls in the rolling 30-day window. Its recorded total was **$0.5013**, but **all 90 events are incomplete** because model prices are missing for some calls. This is not a provider invoice or a complete spend total.
- The incomplete calls are substantial: Gemini 2.5 Flash — 879 calls, 1,321,023 input tokens, 1,157,494 output tokens; `deepseek-v4.1-flash:cloud` — 100 calls, 287,100 input tokens, 220,831 output tokens. The application has no price for either model, so their event cost is recorded as zero and `unpricedModels` marks the total incomplete.
- The 92 priced OpenAI calls were 56 `gpt-5-mini` and 36 `gpt-5-nano`; their application-side estimate sums to $0.5013. This does not establish the account balance or the amount of any failed request.
- The Gemini model was configured through the OpenAI-compatible Google Generative Language endpoint (`DEEPSEEK_BASE_URL`) with `gemini-2.5-flash` as the writer and verifier model. This explains the model mix; the old `DEEPSEEK_*` variable names are compatibility plumbing and must not be interpreted as a DeepSeek bill.
- `OPENAI_QUOTA_EXHAUSTED` appears 11 times in all-time production automation events, most recently 22 November 2026 at 20:00:07 (database time). That error can indicate a balance or spend/usage limit; it does not disclose which one or the remaining balance.
- The bot dashboard's `$75` comparison was only a projection warning threshold. No USD hard-stop is implemented in the application; daily controls limit writer-call counts instead. The production dashboard copy now says explicitly that $75 is not an automatic stop and directs operators to provider billing limits.
- At the post-deploy check, the service was active and the latest recorded cost event remained 22 November 22:06:33; no cost events were written in the preceding 30 minutes.
- The daily newsletter had 15 consecutive warning records from 2 through 23 November: each reported 0 successful out of 2 recipients. All recorded reasons were `mail yapılandırması eksik (RESEND_API_KEY / NEWSLETTER_SECRET)`, and neither variable is present in the production env file. No newsletter mail was sent by this audit. Both cron routes now skip delivery when mail is unconfigured; the dedicated newsletter cron records `MAIL_NOT_CONFIGURED` instead of reporting fake recipient failures.
- There were also 31 generic `402 status code (no body)` errors across 13 failed bot runs from 17–19 November. Those records have no provider/model code, so they do not prove an OpenAI charge or identify the source of the 402. Current code classifies provider 402 responses as a billing/configuration stop, but these historical rows are not attributable from stored evidence.

## What can and cannot be estimated

Google's current published standard paid-tier rates for Gemini 2.5 Flash are $0.30 per million input tokens and $2.50 per million output tokens. Applying those rates to the 30-day token totals gives a rough **$3.29 paid-tier list-price estimate** for the Gemini calls, before any caching adjustments. Google also lists a free tier, so production records cannot establish whether these calls were free or paid. This estimate is not an invoice.

The `:cloud` model's provider and billing basis are not stored per event, and no corresponding price is in the application table. Its actual charge cannot be calculated from this ledger. Provider-side usage pages are required to confirm actual charges.

Sources: [Google Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing.md), [OpenAI API quota error guidance](https://help.openai.com/en/articles/5955604-troubleshooting-api-rate-limits-and-429-errors), and [ChatGPT/API billing separation](https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform).

## Operational state

The automation remains disabled. Do not treat the $0.5013 ledger amount as total AI spend; it excludes the unpriced models. To prevent provider charges if automation is re-enabled, set a hard spending/usage limit in each provider account. The current app-side $75 projection threshold does not enforce one.

Newsletter delivery is unavailable until `RESEND_API_KEY` and `NEWSLETTER_SECRET` are configured on production. The cron code now reports this as a configuration skip. Actual delivery was not tested because that would contact subscribers.

## Newsletter cron durum doğrulaması — 23 Kasım 2026

Canlı `gf-cron.cjs` durum dosyasında, eski genel 200 yanıt sınıflandırması `sent: 0, failed: 2` sonucunu hatalı biçimde başarı saymış ve `lastSuccessAt` yazmıştı. Sınıflandırma artık bültenin `sent`/`failed` alanlarını kullanıyor: sıfır teslimat başarı değil; kısmi teslimat uyarı, sıfır başarılı ve hata varsa hata. Mail anahtarları yokken cron dış HTTP isteği yapmadan `MAIL_NOT_CONFIGURED` durumuna geçiyor ve eski yanıltıcı `lastSuccessAt` değerini temizliyor.

Canlı doğrulama: 23 Kasım 2026 11:18 UTC'de cron yardımcısı `level=warning`, `code=MAIL_NOT_CONFIGURED`, `httpStatus=null`, `lastSuccessAt=null` döndürdü. Böylece doğrulama e-posta sağlayıcısını çağırmadı ve aboneye ileti göndermedi. Yedek dosya: `/opt/gelecekfinans/ops/gf-cron.cjs.bak-20261123-newsletter-status`.

## Yazı hattı çalışma durumu — 23 Kasım 2026

Üretimde `AI_AUTOMATION_ENABLED=false`; `gelecekfinans-news.timer` ve `gelecekfinans-guide.timer` devre dışı. Günlük haber yazımının son başarılı cron durumu 17 Kasım 2026 05:01 UTC, rehber akışınınki 17 Kasım 2026 12:00 UTC. Bu akışları açmak ücretli sağlayıcı çağrısı başlatabileceğinden kapalı bırakıldı. Cron yardımcısı artık `news` ve `guide` işlerinde bu ayarı denetliyor; kapalıyken siteye istek göndermeden `AI_AUTOMATION_DISABLED` uyarısı yazıyor. 23 Kasım 2026 11:21 UTC'deki canlı doğrulamada her iki iş de `httpStatus=null` ve `level=warning` verdi; model API çağrısı yapılmadı. Canlı yardımcı SHA-256: `adc7a2b8c0aea66093278d42abcce903455ba904c42a68fbe2ef449054e5f017`.

Yazı hattının yeniden başlaması için önce sağlayıcı panelindeki gerçek bakiye/kullanım sınırı doğrulanmalı ve hangi sağlayıcıya izin verildiği belirlenmeli. Bu bilgi sunucudaki model çağrısı kayıtlarından çıkarılamıyor.

Üretim env'inin güncel, değersizleştirilmiş özeti: `ARTICLE_AI_PROVIDER=deepseek`; `DEEPSEEK_BASE_URL` host'u `generativelanguage.googleapis.com`; yazar/doğrulayıcı modeli `gemini-2.5-flash`. `OPENAI_API_KEY` mevcut ve OpenAI model değişkenleri `gpt-5-mini` / `gpt-5-nano`, fakat açık `ARTICLE_AI_PROVIDER=deepseek` seçimi nedeniyle bu model ayarları aktif yol değil. Tüm model çağrıları `AI_AUTOMATION_ENABLED=false` ile kapalı. Anahtarın mevcut olması hesap bakiyesi/ücretsiz kota kanıtı değildir; Gemini'nin gerçek ücret durumu Google AI Studio/API billing ekranından doğrulanmalı.

Gelecekteki sağlayıcı hatalarının kaynağını ayırt etmek için haber ve rehber akışlarının `configuration` hata metadata'sına sağlayıcı, yazar modeli ve doğrulayıcı modeli eklendi; API anahtarları loglanmıyor. Üretim kaynakları yedeklenip dar kapsamlı değiştirildi, Next build başarılı oldu, servis `active`/`Result=success`/`NRestarts=0`, ana sayfa HTTP 200. Son maliyet olayı 22 Kasım 2026 22:06:33 UTC olarak kaldı; bu dağıtım ve doğrulama yeni model maliyet olayı oluşturmadı.
