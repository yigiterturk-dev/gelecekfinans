# GelecekFinans AI cost audit — 2026-11-23

## Findings from production

Read-only production configuration and `AutomationEvent` records were inspected on 23 November 2026. No model API calls were made for this audit.

- `AI_AUTOMATION_ENABLED="false"`; the scheduled article-writing automation is off.
- The application recorded 90 cost events and 1,071 usage-bearing model responses in the rolling 30-day window. Its recorded total was **$0.5013**; 78 of the 90 events included at least one unpriced model. All 90 events lack complete outbound-attempt metadata, so 1,071 is a lower bound and failed/unmeasured requests may be missing. The total is not a provider invoice or proof of account charges.
- The incomplete calls are substantial: Gemini 2.5 Flash — 879 calls, 1,321,023 input tokens, 1,157,494 output tokens; `deepseek-v4.1-flash:cloud` — 100 calls, 287,100 input tokens, 220,831 output tokens. The application has no price for either model, so their event cost is recorded as zero and `unpricedModels` marks the total incomplete.
- The 92 measured OpenAI-labeled responses were 56 `gpt-5-mini` and 36 `gpt-5-nano`; their application-side estimate sums to $0.5013. This does not establish the account balance or the amount of any failed request.
- The Gemini model was configured through the OpenAI-compatible Google Generative Language endpoint (`DEEPSEEK_BASE_URL`) with `gemini-2.5-flash` as the writer and verifier model. This explains the model mix; the old `DEEPSEEK_*` variable names are compatibility plumbing and must not be interpreted as a DeepSeek bill.
- The legacy internal code `OPENAI_QUOTA_EXHAUSTED` appears 11 times in all-time production events. The old handler applied this OpenAI-named code to quota-like errors from any configured provider, and those events do not retain provider name or vendor subcode. They therefore do not prove that OpenAI was the provider or that its balance was empty.
- In the rolling 30-day window, 122 bot runs recorded 59 normally added drafts across 50 runs; 72 runs had `articlesAdded=0`. Seven additional blocked drafts (six `VERIFICATION_BLOCKED`, one `QUALITY_BLOCKED`) were linked to six of those zero-added runs for manual review. Thus the 30-day database records 66 bot drafts across 56 runs. Stop events included 17 `AI_BUDGET_LIMIT_REACHED`, 7 legacy provider-quota failures (historically mislabeled `OPENAI_QUOTA_EXHAUSTED`; actual provider unknown), 14 `PLAGIARISM_BLOCKED`, 13 `QUALITY_BLOCKED`, and 6 `VERIFICATION_BLOCKED`; these are event counts, not unique run counts.
- Joining cost events to `BotRun` and counting only review drafts tagged `QUALITY_BLOCKED` or `VERIFICATION_BLOCKED`: 54 of the 90 cost-logged runs saved at least one draft (66 drafts; 709 model calls; estimated $0.0632), while 36 saved none (362 calls; estimated $0.4381). This is based on recorded usage and linked drafts; it cannot account for calls without a usage record or prove provider charges.
- The 92 recorded OpenAI calls (`gpt-5-mini` 56, `gpt-5-nano` 36; estimated $0.5013) split between runs with no linked draft (69 calls, $0.4381) and draft-producing runs (23 calls, $0.0632). Most recorded OpenAI estimate therefore came from runs that saved no linked draft, but some OpenAI calls were part of runs that did save a draft.
- Run-level error text for the 12 OpenAI-using runs grouped as: 9 with quality-block errors (58 calls; one run had a saved draft), one plagiarism block (12 calls, no linked draft), one verification block (9 calls, with a linked rescued draft), and one other error (13 calls, no linked draft). These are associations at run level; a run can contain multiple topic outcomes, so they do not prove which individual call caused a failure.
- Gemini 2.5 Flash had 622 calls in draft-producing runs and 257 in runs with no linked draft. At Google's standard paid-tier list rates, their token totals imply roughly $2.42 and $0.87 respectively; free-tier eligibility and actual billing remain unknown. The 64 productive and 36 no-draft `deepseek-v4.1-flash:cloud` calls remain unpriced and are included in neither amount.
- The 30-day cost ledger has 1,071 calls across stages: 502 judge, 396 writer, 130 verifier, and 43 entity calls. The writer stage accounts for about $0.4981 of the priced $0.5013. The old ledger stored model totals and stage totals separately, so it could not show which model made each stage's calls.
- The bot dashboard's `$75` comparison was only a projection warning threshold. No USD hard-stop is implemented in the application; daily controls limit writer-call counts instead. The production dashboard copy now says explicitly that $75 is not an automatic stop and directs operators to provider billing limits.
- The writer limit does not cap dollars or the verifier/judge/entity stages. The dashboard wording now names it as a writer-call-count limit and states that other model stages also add cost; it no longer labels this a hard spending brake.
- At the post-deploy check, the service was active and the latest recorded cost event remained 22 November 22:06:33; no cost events were written in the preceding 30 minutes.
- The daily newsletter had 15 consecutive warning records from 2 through 23 November: each reported 0 successful out of 2 recipients. All recorded reasons were `mail yapılandırması eksik (RESEND_API_KEY / NEWSLETTER_SECRET)`, and neither variable is present in the production env file. No newsletter mail was sent by this audit. Both cron routes now skip delivery when mail is unconfigured; the dedicated newsletter cron records `MAIL_NOT_CONFIGURED` instead of reporting fake recipient failures.
- There were also 31 generic `402 status code (no body)` errors across 13 failed bot runs from 17–19 November. Those records have no provider/model code, so they do not prove an OpenAI charge or identify the source of the 402. Current code classifies provider 402 responses as a billing/configuration stop, but these historical rows are not attributable from stored evidence.

## Ek bütçe korumaları — 23 Kasım 2026

Admin araştırma/yazı yolu artık haber, rehber ve görsel işlerinin kullandığı PostgreSQL yayın kilidini alıyor. Her yazar model isteğinden, onarım turları dâhil, hemen önce günlük haber çağrı kotası ve koşum başına tavan kontrol edilip `writer_call_reserved` olayı yazılıyor. Model kullanım özeti `cost` olayı olarak kaydediliyor. Kilit alınamazsa veya kota doluysa sağlayıcıya istek gönderilmiyor.

Manuel admin üretimi de artık `BotRun` kaydı açıyor; kota rezervasyonları ve maliyet olayı bu koşuya, maliyet olayı da oluşan taslağa bağlanıyor. Model yanıtında ölçüm yoksa ayrılan yazar çağrısı kaybolmuyor; olay `costIsComplete=false` olarak işaretleniyor. Böylece elle başlatılan koşular, geçmiş model/taslak verim analizine eklenebilir.

Maliyet defterindeki eksik istekleri azaltmak için tüm model SDK çağrıları öncesinde istek denemesi kaydediliyor. Yanıtta token kullanımı yoksa `callsWithoutUsage` artıyor ve maliyet özeti tamamlanmamış işaretleniyor; sağlayıcıdan alınmayan token veya ücret tahmin edilmiyor. OpenAI, Anthropic ve OpenAI-uyumlu istemcilerde SDK'nın görünmeyen otomatik yeniden denemeleri kapatıldı; böylece bir SDK isteği tek HTTP denemesi olur. DeepSeek JSON biçim düzeltme döngüsü açıkça üç denemeye kadar çalışabilir ve her deneme ayrı sayılır. Tüm 11 SDK çağrı noktası tarandı. Bu değişiklikler model isteği çalıştırmadan canlıya dağıtıldı; yeni sayaçların gerçek başarısız isteklerde doğrulanması için otomasyon kapalıyken henüz örnek oluşmadı.

Günlük aşama dökümünde hakem en yüksek 82 çağrıya 12 Kasım'da ulaştı; 30 günde günlük toplamı 60'ı aşan iki gün ve 24'ü aşan on gün vardı. Hakem çağrılarının hangi modele gittiği eski olaylarda çapraz tablolanmadığından, hakem tavanını düşürmenin gerçek parasal tasarrufu hesaplanamıyor; yeni bir üretim koşusu olmadan doğrulama etkisi de ölçülemiyor. Bu nedenle 60/koşumluk tavanı değiştirmedim. Canlı yazar bütçesi 24 çağrı/gün, rehber rezervi varsayılan 8, koşum başına yazar tavanı 6 ve taslak kalite onarımı varsayılan 0. Bu sınırlar dolar tavanı değildir; sağlayıcıdaki gerçek harcamayı durdurmak için OpenAI/Gemini hesap limitleri ayrıca kullanılmalıdır.

Üretimde `OPENAI_API_KEY` var, fakat `OPENAI_ADMIN_KEY` yok; admin paneli OpenAI maliyet API'sini okuyamıyor ve yalnızca Billing bağlantısı sunuyor. Aktif sağlayıcı Gemini uyumlu uç. Bu yüzden OpenAI bakiyesi ve gerçek OpenAI/Gemini faturası sunucu verisinden doğrulanamaz.

Kota benzeri sağlayıcı hataları artık sağlayıcıdan bağımsız sınıflanıyor. Yalnızca sağlayıcı gerçekten OpenAI seçilmişse eski `OPENAI_QUOTA_EXHAUSTED` kodu ve OpenAI bekleme kilidi kullanılıyor; diğer sağlayıcılar `AI_PROVIDER_QUOTA_EXHAUSTED` ve seçili sağlayıcı/uç hostname'iyle kaydediliyor. Yeni olaylar alt kod ve HTTP durumunu da içeriyor. Tarihsel 11 kayıtta sağlayıcı ve alt kod saklanmadığı için geriye dönük ayrım yapılamıyor.

Build `Bc4Ni0lVzFCyfZzywA4Z6` canlıya alındı. İzole üretim derlemesi 300 statik sayfa üretti; AI anahtarları boş, otomasyon kapalı ve günlük harcama tavanı sıfırdı. TypeScript ve hedefli ESLint kontrolleri başarılı; test paketi çalıştırılmadı. Canlı servis `active`, `NRestarts=0`; ana sayfa HTTP 200, oturumsuz admin AI API'si HTTP 401. Dağıtım sonrası model maliyet/rezervasyon kaydı oluşmadı. Geri dönüş kopyası `/root/gf-release-before-provider-quota-fix-20261123`.

## GelecekFinans dışındaki planlı AI taraması — 24 Kasım 2026

Canlı systemd envanterinde ayrıca `nocturn-gap.timer` bulundu. Bu haftalık,
sekiz alan adını birlikte tarayan Nocturn işidir; GelecekFinans son taramadaki
138 Jev değerlendirmesinin 16'sına dahildi. 23 Kasım koşumu 97 yeni Serper
araması ve 138 Jev çağrısı kaydetti; işin kendi tahmini toplam maliyeti
**$0.166/koşum** (Serper ücretsiz katmandaysa bu kısmı $0). Bu tahmin fatura
değildir. Kod doğrudan OpenAI API'sine değil `api.typesafe.ai` Jev servisine ve
`google.serper.dev` arama API'sine çağrı yapıyor; bu nedenle OpenAI API
kotasından ayrı bir olası üçüncü taraf maliyetidir. Kasımın dört haftalık
koşumunda toplam 512 Jev ve 217 yeni Serper çağrısı yapıldı; betik fiyatlarıyla
yaklaşık **$0.47** (Serper ücretsiz katmandaysa yaklaşık **$0.26**). Son koşum
fırsat bulmadı.

Beklenmeyen üçüncü taraf kredi tüketimini önlemek için 24 Kasım'da yalnızca
`nocturn-gap.timer` devre dışı bırakıldı; servis/siteler veya rapor dosyaları
değiştirilmedi. Artık yeni haftalık tarama tetiklenmez. Tekrar etkinleştirmek
için mevcut Jev/Serper hesaplarının kullanım ve ücret durumunu doğrulamak
gerekir. Diğer görülen zamanlayıcılar GelecekFinans yazı otomasyonu değil; GSC,
indeksleme, yerel trafik raporu, sağlık kontrolü ve yedekleme işlerinden
oluşuyor.

30 günlük yazı engeli olaylarını maliyet koşularıyla eşleyince `PLAGIARISM_BLOCKED` etiketli 12 koşuyla 12 ölçülmüş OpenAI çağrısı/$0.0428, `QUALITY_BLOCKED` etiketli 12 koşuyla 38 çağrı/$0.1670, `VERIFICATION_BLOCKED` etiketli 5 koşuyla 23 çağrı/$0.0632 ilişkilendirildi. Aynı koşuda birden fazla konu işlendiğinden bu rakamlar tekil makale veya tekil çağrı sebebini kanıtlamaz; koşu grupları örtüşebilir ve fiyatsız Gemini/DeepSeek çağrıları bu tutarlara dahil değildir. Örnek hata metinlerinde intihal eşleşmelerinin önemli bir bölümü kaynak cümle yapısını tekrar ediyor; kalite retlerinde ise uzunluk/meta ve desteklenmeyen iddia sorunları var. Otomasyon kapalı olduğu için prompt değişikliğini yeni bir model koşusuyla doğrulamadım.

Eski `/api/cron` uyumluluk yolu da aynı yayın kilidini kullanıyor; böylece eski ve yeni haber cron uçları ile manuel admin üretimi aynı anda yazar modeline gidemiyor. Canlı üretim build'i başarılı, servis `active`, `Result=success`, `NRestarts=0`. Ana sayfa ve fiyat API'si HTTP 200. AI otomasyonu `false`, haber/rehber timer'ları devre dışı; bu dağıtımlar model çağrısı oluşturmadı. Son maliyet olayı 22 Kasım 2026 22:06:33 UTC olarak kaldı.

## What can and cannot be estimated

Google's current published standard paid-tier rates for Gemini 2.5 Flash are $0.30 per million input tokens and $2.50 per million output tokens. Applying those rates to the 30-day token totals gives a rough **$3.29 paid-tier list-price estimate** for the Gemini calls, before any caching adjustments. Google also lists a free tier, so production records cannot establish whether these calls were free or paid. This estimate is not an invoice.

After the audit, the usage estimator was updated to apply Google's standard paid-tier Gemini 2.5 Flash rates, including the $0.03 per million cached-input rate, to future cost events. Existing database events were not rewritten. These estimates still cannot determine whether a request used Google's free tier, and they do not establish actual charges. `deepseek-v4.1-flash:cloud` remains unpriced because its provider and billing basis are not recorded.

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

Yönetim panelinde üretim düğmesi, otomasyon kapalıyken veya sağlayıcı yapılandırması bağlı değilken artık devre dışı; sağlayıcı durumu yüklenirken de istek gönderilemiyor. Önceden API bu isteği 503 ile ve model çağrısı yapmadan reddediyordu, fakat tıklanabilir düğme panel durumuyla çelişiyordu.

Üretim env'inin güncel, değersizleştirilmiş özeti: `ARTICLE_AI_PROVIDER=deepseek`; `DEEPSEEK_BASE_URL` host'u `generativelanguage.googleapis.com`; yazar/doğrulayıcı modeli `gemini-2.5-flash`. `OPENAI_API_KEY` mevcut ve OpenAI model değişkenleri `gpt-5-mini` / `gpt-5-nano`, fakat açık `ARTICLE_AI_PROVIDER=deepseek` seçimi nedeniyle bu model ayarları aktif yol değil. Tüm model çağrıları `AI_AUTOMATION_ENABLED=false` ile kapalı. Anahtarın mevcut olması hesap bakiyesi/ücretsiz kota kanıtı değildir; Gemini'nin gerçek ücret durumu Google AI Studio/API billing ekranından doğrulanmalı.

Gelecekteki sağlayıcı hatalarının kaynağını ayırt etmek için haber ve rehber akışlarının `configuration` hata metadata'sına sağlayıcı, yazar modeli ve doğrulayıcı modeli eklendi; API anahtarları loglanmıyor. Üretim kaynakları yedeklenip dar kapsamlı değiştirildi, Next build başarılı oldu, servis `active`/`Result=success`/`NRestarts=0`, ana sayfa HTTP 200. Son maliyet olayı 22 Kasım 2026 22:06:33 UTC olarak kaldı; bu dağıtım ve doğrulama yeni model maliyet olayı oluşturmadı.

Gelecek maliyet kayıtları için `byStageAndModel` kırılımı eklendi. Bu, örneğin Gemini çağrılarının writer, verifier veya judge aşamalarında kaç kez kullanıldığını gösterecek; mevcut geçmiş kayıtlarında bu ilişki yok ve geriye dönük çıkarılamıyor. Üretim build'i başarılı ve servis aktif; AI otomasyonu kapalı olduğu için yeni maliyet olayı oluşmadı.

## Prompt güven sınırı düzeltmesi — 23 Kasım 2026

Yerel yazı motoru ile canlı `writer.ts` karşılaştırmasında canlı sürümün kanıt başlığı/içeriği/URL'sini ham eklediği ve bazı promptlarda dış kaynakları, otomatik itirazları ve denetim notlarını açıkça güvenilmeyen girdi ilan eden talimatların eksik olduğu görüldü. Canlı dosya yerel güvenli sürümle eşitlendi: dış kanıt alanları JSON string olarak sınırlandırılıyor ve kanıt/inceleme girdilerinin talimat kaynağı olmadığı promptlarda belirtiliyor. Üretim derlemesi başarılı; servis yeniden başladıktan sonra aktif ve AI otomasyonu kapalı kaldığı için model çağrısı yapılmadı.

Canlı `/api/bot/generate` route'u yerel sürümden gerideydi: oturum kontrolü dışında CSRF kontrolü, şema doğrulama, istek hız sınırı, otomasyon kapısı ve eşzamanlı üretim kilidi yoktu. Route yerel korumalı sürümle güncellendi; gerekli PostgreSQL kilit yardımcısı ve mevcut `rate_limits` tablosu doğrulandı. Üretim derlemesi başarılı, servis aktif ve AI otomasyonu hâlâ kapalı; bu dağıtım API modeli çağırmadı.

Canlı rehber cron route'u da haftalık üretim kotası ve ortak hat kilidini içermiyordu. Yerel sürümle eşitlendi: haftada en fazla iki rehber adayı oluşturur, eşzamanlı haber/rehber üretimini aynı PostgreSQL kilidiyle sıraya alır ve cron yanıtlarını önbelleğe kapatır. Zamanlayıcılar hâlâ devre dışı; build modeli çağırmadı.

Haber cron route'una da haftada en fazla üç aday kotası, ortak hat kilidi ve `no-store` yanıtı eklendi. Böylece iki otomatik akış açılırsa toplam taslak üretimi haftada en fazla beş adayda kalır; her iki zamanlayıcı da şu anda devre dışı.

Yönetim panelinin maliyet/çalışma raporu endpoint'i yerel sürüme göre istek sınırı ve `no-store` yanıt başlıklarını eksik tutuyordu; ölçülen günleri UTC tarihine göre sayıyordu. Uç güncellendi: oturum ve istek sınırı uygulanıyor, özel maliyet verisi önbelleğe alınmıyor, ölçülen günler İstanbul takvimine göre hesaplanıyor.

Manuel araştırma/yazı endpoint'inde canlı sürüm başlık ve özet uzunluğunu sınırlamıyor, dış hata ayrıntısını istemciye döndürebiliyordu. CSRF, hız sınırı ve AI kapısı korunarak 500 karakter başlık/1.000 karakter özet şeması, güvenli hata yanıtı ve `no-store` başlığı canlıya alındı.

Üretimdeki görsel onarım zamanlayıcısı açıktı; kod yolu Gemini/OpenAI model SDK'sını kullanmıyor, lisanslı medya araması veya yerel şablonla görsel üretimi yapıyor. Görsel route'una ortak yayın kilidi ve özel yanıtlar için `no-store` eklendi. Böylece bu ayrı görsel işi AI yazım motoru olarak sayılmıyor ve aynı anda haber/rehber üretimiyle yarışmıyor.

Görsel cron'unun son sonucu 22 Kasım 16:30 UTC'de başarılı; 23 Kasım 17:30 İstanbul için sıradaki tetikleyici ayarlı. Canlı env özetinde Pixabay anahtarı mevcut, Pexels ve yönetilen ücretli ajans ayarları yok. Pixabay kendi API'sini ücretsiz olarak tanımlıyor, varsayılan sınırı dakikada 100 istek ve arama yanıtlarının en az 24 saat önbelleğe alınmasını istiyor ([resmî API belgeleri](https://pixabay.com/api/docs/)); uygulama sonuçları 7 gün önbelleğe alıyor. Veritabanı sorgusunda eksik görselli BOT makale bulunmadı; bu nedenle mevcut durum değişmezse sıradaki görsel işi Pixabay sorgusu yapmadan sonlanır.

## OpenAI sağlayıcı maliyet görünümü — 23 Kasım 2026

Bot yönetim paneli artık `OPENAI_ADMIN_KEY` varsa OpenAI Organization Costs uç noktasından bu ayın kurum genelindeki API kullanım maliyetini salt okunur sorgulayabilir. Bu rapor kalan kredi bakiyesi veya krediler sonrası tahsilat değildir; panel bunu açıkça ayırır. Anahtar yoksa `ADMIN_KEY_REQUIRED` gösterilir ve harici API çağrısı yapılmaz. Canlı üretimde anahtar yok; derleme başarılı, servis aktif, ana sayfa/fiyat uçları 200 ve otomasyon kapalı doğrulandı. OpenAI maliyet endpoint'i Admin API key ister ([resmî costs referansı](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs), [Admin API anahtarı kullanımı](https://developers.openai.com/api/docs/guides/admin-apis)). ChatGPT/API faturaları ayrıdır ([OpenAI faturalandırma](https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform)).


## OpenAI harcama kilidi — 23 Kasım 2026

`resolveArticleAIConfig` içinde OpenAI sağlayıcısı için ayrı ve varsayılanı kapalı `AI_OPENAI_SPENDING_ENABLED=true` onayı zorunlu kılındı. Böylece AI otomasyonu yanlışlıkla açılsa veya sağlayıcı OpenAI'a çevrilse bile bu ikinci onay olmadan OpenAI modeli seçilemez ve API çağrısı çıkamaz. `.env.example` bayrağı `false` olarak belgeliyor. Üretimde AI otomasyonu kapalı; yeni bayrak tanımlı değilse de varsayılanı kapalı kalıyor. Tek dosyalı kaynak dağıtımından sonra üretim derlemesi başarılı, servis aktif (`Result=success`, `NRestarts=0`), ana sayfa, `/api/altin` ve `/api/kripto` HTTP 200 verdi. Bu denetimde iki ayarı da açmadım ve model çağrısı yapmadım.


## Doğrulama reddi tekrar harcama kilidi — 23 Kasım 2026

İncelemede `ARTICLE_MAX_DRAFT_ATTEMPTS=1` kalite/benzerlik onarımlarını kapatsa da doğrulayıcı retlerinin ayrı bir yazım çağrısı ve ardından ikinci doğrulama çağrısı başlatabildiği görüldü. Bu yol artık `ARTICLE_VERIFICATION_REPAIR_ENABLED=true` ile ayrıca açılıyor; varsayılan kapalı. Reddedilen taslak doğrulanmış/yayımlanmış gibi davranmaz; mevcut doğrulama engeli ve manuel inceleme yolu korunur. Yönetim paneli metni de iki onarım yolunu ayıracak şekilde düzeltildi. Değişiklik model çağrısı yapmadan üretime alındı; build başarılı, servis aktif, `NRestarts=0`, ana sayfa HTTP 200.


## OpenAI kilidi cron girişinde de uygulandı — 23 Kasım 2026

Kod taramasında `OPENAI_API_KEY` kullanan tek model istemcisinin `lib/bot/writer.ts` olduğu; cron yardımcısının ise seçili sağlayıcı OpenAI iken API anahtarı mevcut diye iç cron endpoint'ine yine istek gönderebildiği görüldü. Cron başlatıcısı artık `AI_OPENAI_SPENDING_ENABLED` kapalıysa haber/rehber isteğini göndermeden `OPENAI_SPENDING_DISABLED` uyarısı kaydediyor. Bu, sunucu tarafındaki zorunlu sağlayıcı kilidine ek koruma; model çağrısı yapmaz. `node --check` başarılı, değişiklik yedeklenip üretime kopyalandı, uygulama servisi aktif kaldı.


## Model isteği uç noktası kaydı — 23 Kasım 2026

Gelecek model kullanım özetleri artık aşama/model sayaçlarının yanında yalnızca uç hostname'ini de kaydediyor; URL path'i, query veya kimlik bilgisi saklanmıyor. Yönetim panelinde model adları ve uç hostname bazında tahminler ayrılıyor. Eski olaylarda bu alan yok; gerçek fatura/ücretsiz katman kanıtı da değildir. Cron ve uygulamadaki OpenAI kilitlerinden bağımsız salt kayıt değişikliği model çağrısı yapmadı. Üretim build'i ve TypeScript kontrolü başarılı, servis aktif, ana sayfa HTTP 200 ve oturumsuz özel maliyet endpoint'i beklenen 401 durumunu verdi.


## Eksik maliyet kaydı görünürlüğü — 23 Kasım 2026

Eski cost endpoint'i tahminleri model adına göre gösteriyor ama `attemptedCalls`, `callsWithoutUsage` ve `costIsComplete` alanlarını düşürüyordu; bu nedenle fiyatı bilinen modelde kullanım verisi eksik çağrılar toplamı tam gibi gösterebilirdi. Yönetim endpoint'i artık eksik usage'lı çağrıları ve eski, deneme sayısı tutulmayan koşuları sayıyor; panel tahmini `+` işaretiyle alt sınır olarak etiketliyor ve eksik ölçüm uyarısı gösteriyor. Cost metadata'sı olmayan eski cost olayları da doğrulanmamış kabul ediliyor. Üretim build'i başarılı, servis aktif, ana sayfa 200 ve oturumsuz özel endpoint 401 verdi; model çağrısı yapılmadı.

Bu uyarı canlı üretim verisiyle doğrulandı: son 30 günde 90 cost olayı var ve bunların hiçbirinde `attemptedCalls`, `callsWithoutUsage` veya `costIsComplete` alanı yok; en yenisi 22 Kasım 2026 22:06:33 UTC. Yönetim paneli bu 90 eski koşuyu maliyet kapsamı doğrulanmamış olarak sayacak; eski veriden kayıp başarısız çağrı adedini geriye dönük türetmek mümkün değil. Otomasyon kapalı olduğundan yeni formatta henüz canlı örnek oluşmadı.

## Günlük tahmini harcama freni — 23 Kasım 2026

Her model isteğinden hemen önce günlük uygulama maliyet tahmini kontrol ediliyor. Varsayılan ve canlı değer `AI_DAILY_SPEND_LIMIT_USD=0`; sıfırda sağlayıcı isteği atılmıyor. Pozitif limit kullanılırsa prompt UTF-8 bayt uzunluğu giriş tokenları için ihtiyatlı tahmin, istekteki azami çıktı tokenı da çıktı tahmini olarak mevcut model fiyat tablosundan hesaplanıyor. Bu tam rezervasyon, PostgreSQL işleminde gün içi harcamayla atomik karşılaştırılıp model isteğinden önce kalıcı kaydedilir; kullanılmayan çıktı rezervi de İstanbul günü sonuna kadar tavan içinde tutulur. Böylece eşzamanlı veya çöken koşumlar aynı günlük payı ikinci kez kullanamaz. Fiyatı bilinmeyen modeller ve gün içindeki eksik/ölçümsüz eski kullanım kayıtları yeni isteği kapalı tutuyor. Tavan, sağlayıcının gerçek faturası veya kuruluş genelindeki fatura sınırı değildir.

Değişiklikler izole üretim kopyasında derlendi; TypeScript tamamlandı ve 300 statik sayfa üretildi. Build sırasında otomasyon kapalı, OpenAI/DeepSeek/Anthropic/Gemini anahtarları boştu. Build `Jy190-BRtkdu_ky3TJcAw` 23 Kasım'da canlıya alındı. Sonrasında servis `active`, yeniden başlatma sayısı 0; ana sayfa HTTP 200, oturumsuz yönetim maliyet API'si HTTP 401 döndü. Canlı ayarlar: `AI_AUTOMATION_ENABLED=false`, `AI_DAILY_SPEND_LIMIT_USD=0`, seçili sağlayıcı `deepseek`; haber/rehber zamanlayıcıları pasif. Canlı maliyet defterindeki son 24 saatin dört eski maliyet kaydı, 22 Kasım 22:06:33 UTC'deki son olayla aynı kaldı; yeni maliyet olayı yazılmadı. Model API çağrısı yapılmadı. Geri alma kaynakları ve build `/root/gf-release-before-spend-guard-20261123` içinde saklı; önceki `.next` ayrıca `/opt/gelecekfinans/.next.bak-20261123-spend-guard` altında.

Aktarım sonrasında canlı `public/` içindeki çalışma alanında bulunmayan medya dosyaları geri alma kopyasından geri yüklendi; toplam 364 medya dosyası ve örnek eski görsel URL'si HTTP 200 ile doğrulandı. Üretime özgü `veri/hit-raporu.md` ile `veri/hit-tahminleri.jsonl` dosyaları da geri yüklendi.

## Rezervasyon kalıcılığı — 23 Kasım 2026

İlk tavan sürümünde rezerv yalnızca süreç belleğinde tutuluyordu; uygulama çöker veya günlük iş kilidi süresi dolduktan sonra ikinci bir koşum başlarsa aynı pay tekrar kullanılabilirdi. Her ücretli model çağrısı için artık PostgreSQL işlem/advisory lock altında günlük toplam kontrol edilip azami maliyet önceden kalıcı bir `model_spend_reservation` olayı olarak yazılıyor. Yeni sürümde rezerv gün sonuna kadar tam tutarıyla sayılır; sonradan ölçülen maliyet rapora girer ama rezervi azaltmaz. Bu bilinçli üst tahmindir ve eşzamanlılık/çökme durumunda payın aşılmasını engeller. Günlük tavan sıfır olduğundan şu anda rezervasyon yazılmaz ve model isteği gönderilmez.

Build `Kth3tgbUKkwO9RelGittD` canlıya alındı. Üretim veritabanıyla izole derleme TypeScript'i tamamladı ve 300 statik sayfa üretti; otomasyon kapalı, model API anahtarları boştu. Canlıda servis aktif ve yeniden başlatma sayısı 0; `AI_AUTOMATION_ENABLED=false`, `AI_DAILY_SPEND_LIMIT_USD=0`; ana sayfa ve eski medya URL'si HTTP 200, oturumsuz AI sağlayıcı yönetim API'si HTTP 401. Önceki derleme ve ilgili kaynakların geri dönüş kopyası `/root/gf-release-before-persistent-reservation-20261123`, önceki `.next` ise `/opt/gelecekfinans/.next.bak-20261123-persistent-reservation` altında.

## Son 14 günlük üretim defteri yeniden okuması — 23 Kasım 2026

Canlıdaki salt okunur `scripts/maliyet.ts 14` çıktısı 76 maliyet koşusu ve kullanım ölçümü dönen 875 model isteği gösterdi: 683 `gemini-2.5-flash`, 100 `deepseek-v4.1-flash:cloud`, 56 `gpt-5-mini`, 36 `gpt-5-nano`. OpenAI modeli olarak etiketlenen 92 ölçümlü çağrının uygulama fiyat tablosu tahmini toplamı **$0.5013**; bu hesap faturası/bakiye değildir. Gemini geçmiş kayıtları oluşturuldukları sırada fiyat tablosuna sahip olmadığından defterde $0 görünür; kaydedilen 1,084,812 girdi ve 997,026 çıktı tokenı bugünkü Google standart ücretli metin liste oranlarıyla yaklaşık **$2.818** eder. Google ücretsiz katman da sunduğu için gerçek tahsilat bilinmiyor. DeepSeek etiketi `:cloud` son ekli ve doğrulanmış model fiyatıyla eşleşmediği için 287,100 girdi ve 220,831 çıktı tokenı fiyatlandırılamıyor. 30 günlük 90 maliyet olayında deneme sayısı/eksik kullanım alanları yok; başarısız veya ölçümsüz ek çağrılar varsa bu dökümde görünmüyor. Dolayısıyla çağrı sayısı ve token tabanlı tutarlar kayıtlı alt sınırdır; gerçek toplam sağlayıcı faturası bu defterden çıkarılamaz.

Bu okuma model çağrısı yapmadı. Son maliyet olayı hâlâ 22 Kasım 2026 22:06:33 UTC; AI otomasyonu ve haber/rehber zamanlayıcıları kapalı. OpenAI Platform bakiyesi bu ortamda okunamadı: Safari'de OpenAI billing sayfası açık değildi ve tarayıcı kontrol servisi erişilemedi.

## İstemci zaman aşımından sonra süren yazım koşumu — 23 Kasım 2026

22 Kasım 22:00:16 UTC'de başlayan rehber cron isteği 22:05:06 UTC'de (290 saniye) `REQUEST_FAILED` olarak bitti; aynı uygulama koşumu 22:06:33 UTC'ye kadar sürdü ve 6 model çağrısı / 62.854 token / $0,0852 tahmini maliyet kaydetti. İki taslak da kalite kapısından geçmedi. İstemci bağlantısı kesilmesi model SDK çağrılarına aktarılmıyordu; cron işi başarısız görünürken uygulama ücretli çağrıları sürdürüyordu.

Haber ve rehber cron rotaları artık Next.js `Request.signal` sinyalini `AsyncLocalStorage` ile yazım hattına taşıyor. Yazar, doğrulayıcı, hakem ve varlık çıkarımı SDK istekleri aynı sinyali kullanıyor; bağlantı kapanınca aktif SDK HTTP isteği iptal ediliyor, abort hatası başarı/boş sonuç gibi yutulmuyor ve yeni konu/onarım çağrıları başlatılmıyor. Build ve TypeScript başarılı; servis aktif, ana sayfa 200, cron uçları oturumsuz 401. OpenAI otomasyonu kapalı ve haber/rehber zamanlayıcıları devre dışı olduğundan bu davranış ücretli model çağrısı açmadan derlendi; sağlayıcının bağlantı iptalinden sonra işlemeyi durdurup durdurmadığı veya önceden işlediği tokenları nasıl faturaladığı garanti edilemez.

## Yazı uzunluğu eşiği ve boşa giden onarım çağrıları — 23 Kasım 2026

Canlı koşum kayıtlarında 22 Kasım 22:00 UTC'de iki taslak 513 ve 588 kelimede kalite kapısına takılmış; bunlar için koşum 6 model çağrısı ve $0,0852 tahmini maliyet kaydetmiş. Üretimde yazım istemi en az 500 kelime derken haber kalite kapısı en az 600 istiyordu; modelin 500 civarına tutunması iki eşiği uyumsuz hale getiriyordu. İstem artık 650 kelime alt sınır, 700 hedef ve 800 üst sınır veriyor; kanıt desteklemiyorsa neden/etki uydurmamasını ve tekrar/dolgu yapmamasını söylüyor. Değişiklik canlıya alındı, build ve TypeScript başarılı; servis aktif, ana sayfa 200, özel endpoint 401. `AI_AUTOMATION_ENABLED=false` ve `ARTICLE_MAX_DRAFT_ATTEMPTS=1` doğrulandı. Bu düzeltme henüz sonraki gerçek yazım koşumunda doğrulanmadı; API çağrısı yapılarak denenmedi.

## Sonraki canlı kontrol ve içerik düzeltmesi — 23 Kasım 2026

Canlı sunucuda uygulama servisi aktif; `AI_AUTOMATION_ENABLED=false`, haber/rehber/görsel zamanlayıcıları devre dışı. `.env.production` içindeki `ARTICLE_AI_PROVIDER=deepseek` yapılandırması gerçekte Google Generative Language OpenAI uyumlu uca (`generativelanguage.googleapis.com`) ve `gemini-2.5-flash` modeline gidiyor; `DEEPSEEK_*` adları yanıltıcı yapılandırma adlarıdır, bu çağrıları DeepSeek faturası diye yorumlamamak gerekir. OpenAI anahtarı mevcut olsa da açık provider seçimi OpenAI değil; ayrıca OpenAI harcama bayrağı açık değil. Son görülen cost kaydı 22 Kasım 22:06 UTC'deki 6 çağrılık, $0,0852 tahminli koşumdur; 0 makale kaydetmiş ve 2 taslak kalite kapısına takılmıştır. 23 Kasım 05:00 UTC bülten kaydı 0/2 teslimat gösteriyor; mail yapılandırması eksik olduğu için e-posta gönderimi yoktur.

Canlı `gram-altin-hesaplama-nasil-yapilir` yazısı ayrıca incelendi ve yanlış şekilde ziynet ile Cumhuriyet (meskûk) altınlarının gramajlarını aynı gösterdiği görüldü. Darphane nominal ağırlıklarına göre yazı baştan düzenlendi; tür bazlı çeyrek/yarım/tam ağırlıklar, has değer formülü, troy ons dönüşümü ve KDV kapsamı resmî Darphane, Borsa İstanbul, GİB ve NIST kaynaklarıyla açıklandı. `Article.source` alanı da kaynak kurumlarla dolduruldu. Veritabanında kayıt PUBLISHED kaldı; canlı yazı HTTP 200 ile yeni metni sunuyor. Bu sayısal/finansal içerik güncellemesi model çağrısı kullanmadı.

Yayımlanmış içerik risk kuyruğu da yeniden sayıldı: 12 kayıt `riskLevel=RED`, `publicationDecision=REVIEW` ve `autoPublished=false` olarak hâlâ PUBLISHED. Bunlar otomasyonun otomatik yayımladığı içerikler değil; durumları daha önce editörce manuel yayımlanmış kayıtlarla uyumlu. RED nedenleri başlık/özet hassas terim taramasından geliyor ve bazı eşleşmeler özet bağlamı olmadan bu kayıt üzerinden doğrulanamıyor. Bu turda güvenlik bayrağı veya yayın durumunu topluca değiştirmedim; yanlış toplu yayından kaldırma riski olmadan içerik bazlı editoryal inceleme gerekiyor.

12 kayıt içerik ve tarih bağlamı açısından tek tek tarandı. Başvuru dönemi kapanan İstanbul kiralık sosyal konut yazısı, güncel TOKİ duyurusuna göre başvuruların 25 Eylül'de bittiğini söyleyecek şekilde yenilendi; kura sonucu resmî olarak doğrulanmadığından gerçekleşmiş gibi sunulmadı. DASK yazısı, 5 Eylül 2026'dan itibaren geçerli kuralı DASK'ın güncel SSS'sine göre düzeltti: alıcı kendi poliçesini satıştan önce yaptırmalı, satıcının poliçesi işlem günü sona erer ve kullanılmayan prim için başvuru gerekir. Liquid Network olayı, 5 Eylül haftalık küresel piyasa özeti ve Şimşek'in Ağustos TÜFE açıklaması da tarihsel içerik oldukları başlık/meta/ilk paragrafta açıkça belirtilerek güncellendi. Altın hesaplama yazısındaki ziynet/meskûk gramaj farkı da önceki bölümde düzeltildi. Değişen altı yazının SEO skorları `analyzeSeo` fonksiyonuyla yeniden hesaplanıp DB'ye yazıldı: sırasıyla 74, 85, 80, 89, 79 ve 82. Altı sayfanın tamamında güncel metin HTTP 200 canlı yanıtında doğrulandı; Şimşek sayfası 300 saniyelik önbellek süresi sonunda yenilendi. Diğer yedi kayıtta metinler zaten tarihsel/evergreen olarak ayrılmıştı veya iddia açıkça resmî karar diye sunulmuyordu; bu nedenle yayın durumları ve risk işaretleri değiştirilmedi.

## Live cost/state recheck — 2026-11-24

The production `scripts/maliyet.ts 30` report was run read-only against the live
DB. It still returns 90 cost events and 1,071 responses with usage through 23
November. The ledger shows $0.5013 of priced OpenAI adapter usage and 979
unpriced responses (879 `gemini-2.5-flash`, 100
`deepseek-v4.1-flash:cloud`). It is not a provider invoice. The Gemini events
alone would be about $3.29 at Google's published standard paid-tier text rates
($0.30/M input and $2.50/M output; [official pricing](https://ai.google.dev/gemini-api/docs/pricing)) using their recorded 1,321,023 input and
1,157,494 output tokens. This estimate does not establish charges: Google free
usage eligibility, account tier, and invoice are unknown. The 100 DeepSeek
Cloud events remain unpriced and their billing route is not recorded.

Production env confirms `AI_AUTOMATION_ENABLED=false`,
`AI_DAILY_SPEND_LIMIT_USD=0`, and `ARTICLE_AI_PROVIDER=deepseek`; the endpoint is
Google's Generative Language service configured to serve Gemini 2.5 Flash. The
OpenAI article model setting is present, but OpenAI is not selected. The
`gf-nobet.timer` is active, but its deployed script checks the off switch before
any LLM ping and exits 0 without an API request. The 30-day cost ledger has no
entry later than 23 November. The provider account UI was not available in this
session, so OpenAI remaining credit and Google billing state remain unknown.

## Zero-article run recheck — 2026-11-24

A live read-only aggregation of the same rolling 30-day window found 122 bot
runs. Seventy-two added no article: 50 ended with status `completed`, and 22
with status `failed`. The database has 435 writer-call reservations across all
runs. These counters show that “run completed” does not mean an article was
published, and some failed runs may already have spent on earlier model stages.
Historical cost events still lack endpoint-host and stage/model cross-tabs, so
the old spend cannot be assigned more precisely per failure cause. The
read-only `scripts/maliyet.ts` output now displays endpoint and stage/model
breakdowns when future cost events contain them; old rows are explicitly
reported as missing those dimensions. No model API call was made.

### Historical stage/model cross-tab from run-start settings — 2026-11-24

The deployed report now reconstructs a best-effort cross-tab by combining each
cost event's stage totals with its linked run's recorded writer/verifier model
and provider. This is possible for old events even though they did not store an
explicit stage/model cross-tab; the mapping uses the run-start config and is
marked incomplete when that record is absent.

- Runs tagged `deepseek` but configured for Google Gemini account for 690
  `gemini-2.5-flash` responses: 439 judge, 170 writer, 40 verifier, 41 entity.
- Runs tagged `openai` account for 60 responses: 24 `gpt-5-mini` writer, 31
  `gpt-5-nano` judge, and 5 `gpt-5-nano` verifier. Their priced estimate is
  $0.2136.
- Another 260 responses have no provider/model run-start metadata: 180 writer
  and 80 verifier calls. Their event models include 189 Gemini, 32 GPT-5-mini,
  and 39 DeepSeek Cloud calls. The $0.2877 GPT-5-mini estimate in this group
  cannot be attributed to an OpenAI endpoint from stored records.
- The remaining 61 DeepSeek Cloud responses are in `deepseek`-tagged runs:
  32 judge, 22 writer, 5 verifier, and 2 entity. The provider billing route is
  still unknown.

This breakdown accounts for 1,071 usage-bearing responses. It narrows the
known OpenAI-adapter estimate to $0.2136 while leaving $0.2877 of GPT-5-mini
usage unattributed to a provider. Neither figure is a provider invoice or
balance. The process remains paused at the zero-spend setting; no API request
was made for this cross-tab.

## Other production integrations and scheduled jobs — 2026-11-24

A read-only production config check reported only whether selected variable names
were populated; secret values were not printed. OpenAI, the DeepSeek-compatible
adapter key, Pixabay, EVDS, and Google Search Console credentials are present.
Anthropic, Resend, and Pexels credentials are absent. The selected adapter's
actual host is Google's Gemini-compatible endpoint. News, guide, and image
systemd timers are inactive. Active GelecekFinans timers are the zero-spend
watchdog, local backup, IndexNow notification, GSC sync, hit monitor, and its
weekly calibration. The watchdog exits before any LLM request while automation
is off.

The non-model integrations visible in source are public data feeds (TCMB,
Frankfurter, Yahoo Finance, and CoinGecko) and stock-image search. TCMB states
that EVDS is free; CoinGecko offers a zero-cost Demo API plan; Pixabay documents
free API use, a 100-requests-per-minute default limit, and a requirement to
cache results for 24 hours. The app's Pixabay query cache is seven days. The
Pixabay key is present, but the scheduled image job is disabled; manual image
selection may query Pixabay. None of these is an OpenAI/Gemini model charge.
Sources: [TCMB EVDS privacy policy](https://evds3.tcmb.gov.tr/igmevdsms-dis/documents/showDocument?docId=19),
[CoinGecko API plans](https://www.coingecko.com/en/api/pricing),
[Pixabay API docs](https://pixabay.com/api/docs/).

Newsletter delivery has no Resend key and therefore is not sending mail or
incurring Resend API usage. This inventory covers app integrations and the
observed GelecekFinans timers; it does not inspect provider invoices or the
VPS hosting bill.

Runtime detail for the feed inventory: the `EVDS_API_KEY` is set and the
inflation data helper caches successful responses for one hour; the separate
policy-rate EVDS adapter is not used by the public rate page. CoinGecko is
called through its public `api.coingecko.com` endpoint without a Pro API key.
The crypto helper uses a five-minute revalidation window. The free API has
published rate limits; a paid CoinGecko plan is not configured in this app.
TCMB confirms EVDS is free, and CoinGecko lists a zero-cost Demo plan. These
settings indicate no configured subscription charge from either feed, but do
not prove what another account may have purchased.

### Reattributing legacy quota and 402 errors — 2026-11-24

A further read-only join against the run-start events refines the old error
labels. Of 11 all-time `OPENAI_QUOTA_EXHAUSTED` events, 8 belong to runs whose
start metadata selected OpenAI (4 with `gpt-5.6-luna`, 4 with `gpt-5-mini` /
`gpt-5-nano`); 3 have no provider/model start metadata. The error events
contain only the legacy `code` field—no provider, vendor subcode, or HTTP
status. This is evidence that the OpenAI route was selected in those 8 runs,
but it still cannot distinguish empty prepaid credit from a project spend cap,
rate limit, or a generic provider error. It does not show the current account
balance.

Separately, 13 zero-add bot runs contain historical `402` errors. Six have
run-start metadata selecting the `deepseek` adapter configured for Gemini 2.5
Flash; seven lack provider/model metadata. The corresponding events have no
recorded token-usage cost event, and the old error payload stored no provider
subcode. This strengthens the conclusion that the 402 cluster was not solely
an OpenAI issue, while leaving those seven runs unattributed. No provider API
was called for this check.

## Corroboration-judge efficiency sample — 2026-11-24

A read-only count of `corroboration_judge` topic events for the rolling 30 days
found 338 topics with 747 stored verdict entries: 66 topic events resolved
(19.5%), while 681 recorded verdicts were negative. The verdict-entry count
is not a billable-call count because the process can reuse cached verdicts;
the usage ledger separately records 502 measured judge-stage model responses.
No automated source exclusion was applied because these verdicts are model
outputs, not independently reviewed ground truth.

Candidate-source rates are uneven. Examples with at least 25 stored verdicts:
Yeni Asır 0/67, TRT Haber economy 0/66, Sözcü finance 8/75, Dünya 4/64,
CNN Türk 5/55, Bloomberg HT 13/43, and ForInvest 4/25. This suggests the
feed-to-topic candidate pairing deserves a targeted audit: some sources may
be adding many false candidate pairs, while others more often confirm a story.
It does not prove that the zero-positive sources are unreliable or that the
positive model verdicts are correct. Any exclusion or threshold change should
follow a human-labeled sample so the two-independent-publisher gate is not
weakened by an apparent cost optimization. Automation remains disabled, and
this analysis made no provider calls.

### Judge cache collision fix — 2026-11-24

Code inspection found that the same-story verdict cache used only the two
headlines as its key and survived across runs. If a publisher reused a generic
headline for a later, different event, the old boolean verdict could be reused
without comparing the new summaries or dates. The local source now keys the
cache by both publishers, headlines, summaries, and publication timestamps,
and clears it when a run starts. This protects the independent-source decision
from stale headline-only matches. The production-source build compiled
successfully, passed TypeScript, and generated 300 static pages with automation
disabled and AI keys blank. It was deployed as build
`9TjB0kNPTCB8rzkScHHSR` on 2026-11-24. Post-deploy checks: service active,
`NRestarts=0`, homepage HTTP 200, admin AI-provider endpoint HTTP 401,
`AI_AUTOMATION_ENABLED=false`, and daily spend limit `$0`. The pre-deploy build
and writer source are retained under
`/root/gf-release-before-judge-cache-20261124` for rollback. No model calls
were made during build or deployment.

### No-added run and recent article-length snapshot — 2026-11-24

A read-only stage aggregation of the 90 rolling-30-day cost events split 40
runs with `articlesAdded=0` (33 completed, 7 failed) from 50 runs that added
articles. The no-added group recorded 178 writer, 37 verifier, and 206 judge
responses. Its application-side priced estimate was $0.498112 at the writer
stage, $0.001473 at verifier, and $0.001713 at judge. This is not a provider
invoice, and unpriced Gemini/DeepSeek usage is excluded; `articlesAdded=0`
also does not mean no review draft was saved. The article-adding group
recorded 218 writer, 93 verifier, 296 judge, and 43 entity responses, all from
unpriced models in the app ledger. This confirms that missing provider prices
hide actual cost in both productive and no-added runs.

The same no-added runs had 97 `NO_SECOND_SOURCE` research stops. Similar-title
and same-source duplicate checks accounted for 65 and 61 skips respectively;
the source code places these checks before the writer budget reservation, so
they are not writer-call waste. This points to source coverage and post-write
quality/verification outcomes as the remaining investigation areas; the
independent-publisher gate remains unchanged.

A text-length count of 58 BOT articles published in the rolling 30 days found
43 below 500 words and 51 below 650. No BOT article was published after
2026-11-23 00:00 UTC; production automation was paused, so there is no
post-prompt run to validate the new 650-word target. The counts identify older
published content for editorial review, not proof that each short article is
inaccurate or low quality.

### News quality floor aligned — 2026-11-24

The live prompt required a 650-word minimum, but `NEWS_QUALITY_PRESET` still
accepted 280-word stories. The minimum was changed to 650 so the deterministic
quality gate now enforces the prompt. The writer still must use supported
evidence; when that material cannot support a correct 650-word story, the
quality gate blocks it rather than allowing filler or invented claims. Guide
and entity presets are unchanged. The `validDraft` fixture was adjusted to
reflect the new default news contract; no tests were run.

The production-source build passed TypeScript and generated 300 static pages
with AI automation disabled, spend set to `$0`, and model keys blank. Deployed
as build `Op1BsR-4s6apUeis5dOBt` on 2026-11-24. Post-deploy: service active,
`NRestarts=0`, homepage HTTP 200, admin AI-provider endpoint HTTP 401,
production news minimum 650, AI automation false, and daily spend `$0`.
Rollback snapshot: `/root/gf-release-before-news-word-floor-20261124`. No model
calls were made. There is still no post-deploy writer run because generation
remains paused, so actual model output against the new hard gate is unmeasured.

The first 650-word-floor build also exposed a waste path: short/long word-count
issues were not marked cosmetic, so `writeArticle` discarded an otherwise
safe, paid draft instead of sending it for review. Word-count limits now mark
as cosmetic; if the only remaining issues are cosmetic and plagiarism passes,
the draft is saved as unpublished `DRAFT`/`REVIEW`. Unsupported evidence,
plagiarism, and unsafe claims remain hard stops. This targeted change was
built and deployed as `FcNtGAQLi0RouVyeT5uIR` on 2026-11-24. TypeScript and 300
static pages succeeded; post-deploy service active, `NRestarts=0`, homepage
HTTP 200, admin API HTTP 401, automation false, and spend limit `$0`. Rollback
snapshot: `/root/gf-release-before-review-short-drafts-20261124`. No tests or
model calls were run.

### Provider-label check — 2026-11-24

The `deepseek` value is the internal OpenAI-compatible adapter selection. The
admin AI-provider endpoint checks `DEEPSEEK_BASE_URL`; when it points at
Google's Generative Language host, it displays `Google Gemini API (uyumlu uç)`
and links to Google AI Studio. The request ledger records the endpoint hostname
as well. Run metadata's `provider=deepseek` names the adapter, while the UI
label and endpoint hostname identify Google as the configured API endpoint.
The admin panel therefore labels the configured route as Gemini, not DeepSeek.
The usage price table contains a Gemini 2.5 Flash estimate for future calls;
older zero-priced events remain historically incomplete and are not
retroactively reconciled to an invoice.

### Live RSS corroboration snapshot — 2026-11-24

The production read-only feed diagnostic fetched 347 classified items from the
current direct-publisher RSS feeds and grouped them into 307 near-unique
topics. Of those, 88 (29%) already had two-source evidence by text matching,
166 (54%) had at least one gray-band candidate for the corroboration judge,
and 53 (17%) had no candidate. This is a feed-pool diagnostic, not a full
production run: it uses a broad all-feed sample and assigns uniform source
priority, while production also limits and ranks topics. It made no model
calls. It does not justify excluding any source or weakening the two-publisher
gate; the largest safe next step is source-specific candidate-pair review.

The source-specific sample found no feed HTTP/parse failures (30 configured
feeds, 348 classified items, 308 near-unique topics). Among primary topics,
Dünya had 11/36 automatic two-source matches and 21 gray topics; Cumhuriyet
6/28 and 18 gray; ForInvest 6/24 and 15 gray; Sözcü economy 7/23 and 14 gray;
Yeni Şafak 10/21 and 11 gray. Hürriyet had 17 unique topics but no automatic
match or gray candidate in this snapshot. Because Hürriyet is eligible for the
48-hour, explicitly attributed single-source lane, it was not removed from the
feed list based on this one sample. These are matching statistics, not an
editorial accuracy score or human-labeled benchmark.

To test the actual production ranking rather than the broad pool, the current
`getTopics(24)` path was also run read-only. It returned 16 verified topics,
8 topics with gray-band candidates, and zero selected topics without a second-
source path; the eight gray topics exposed 22 candidate pairs. No topic entered
the attributed-only lane in this sample. Thus, in this snapshot, broad-pool
dead topics are not displacing candidates from the first 24 production slots.
The remaining immediate corroboration bottleneck is whether the judge confirms
these gray pairs; this live check deliberately made no judge/model calls.

### Review-draft evidence retention — 2026-11-24

Inspection of the short-draft rescue path found that news drafts were saved
without their evidence packet and with a placeholder source score of zero.
All blocked drafts were also tagged `blockedBy: VERIFICATION`, including
quality-only length issues. The writer now attaches the actual evidence packet
to quality and verification block payloads; the news orchestrator carries that
packet into the saved DRAFT and records the topic's source score. The saved
metadata now distinguishes `QUALITY_BLOCKED` from `VERIFICATION_BLOCKED` and
retains generic review reasons (while preserving the verification-specific
field for existing readers). Status remains unpublished `DRAFT`/`REVIEW`.

The production-source build passed TypeScript and generated 300 static pages
with automation disabled, the daily spend cap at `$0`, and model keys blank.
Deployed as build `lsNpPIZGMn6wNIjFKwCtL` on 2026-11-24. Post-deploy: service
active, `NRestarts=0`, homepage HTTP 200, admin AI-provider endpoint HTTP 401,
automation false, and daily spend `$0`. Rollback snapshot:
`/root/gf-release-before-blocked-evidence-20261124`. No tests or model calls
were run; the saved-draft behavior has been build- and source-verified, not
exercised with a live model generation.

### Admin review evidence visibility — 2026-11-24

The bot dashboard now expands each decision to show retained evidence entries,
publication dates, source links (HTTP/HTTPS only), blocked-by code, review
reasons, and quality/verification objections. The isolated production-source
build passed TypeScript and generated all 300 static pages with AI automation
disabled, model keys blank, and the daily spend cap at `$0`. Build
`nxYXLgDpiFrugHHlT9yzM` is live. Post-deploy, the service is active with
`NRestarts=0`, the homepage returns HTTP 200, the unauthenticated admin provider
endpoint returns HTTP 401, and production automation remains disabled with a
`$0` daily cap. No tests or model calls were run. Rollback snapshot:
`/root/gf-release-before-dashboard-evidence-20261124`.

### Historical spend visibility and Gemini model transition — 2026-11-24

The live, read-only 30-day ledger has 879 `gemini-2.5-flash` responses
(1,321,023 input and 1,157,494 output tokens). At Google's current standard
paid rates, that token volume is about `$3.2900`; free-tier eligibility and the
actual Google invoice are unknown. Another 189 Gemini responses have no
provider run-start record. The application-recorded OpenAI estimate remains
`$0.5013`; 61 `deepseek-v4.1-flash:cloud` responses are unpriced, and a further
39 DeepSeek Cloud responses lack provider run-start metadata. These figures are
not additive proof of a provider invoice. There have been no durable
`model_spend_reservation` records in this rolling 30-day window; the writer
remains disabled and its daily spend cap is `$0`.

The cost report now separates old events' zero-priced ledger values from a
current standard-tariff comparison, and shows durable per-call pre-reservations
as a budget upper bound without adding them to measured usage. New reservations
also retain stage, model, and endpoint hostname, so a failed process can still
leave useful cost-attribution evidence. The Gemini-compatible adapter is
reported as Google Gemini when its model ID is a Gemini model; the internal
`deepseek` adapter name is retained only as a qualifier.

Google's developer docs, checked 2026-11-24, say `gemini-2.5-flash` requests
will route to `gemini-3.5-flash-lite` from 2026-12-01. Their currently listed
standard text rates are both `$0.30`/1M input and `$2.50`/1M output tokens. The
spend estimator now recognizes that successor at those rates. The production
setting remains `gemini-2.5-flash`; automation is off, and response quality on
the replacement was not tested because that would require model calls. The
change is in build `jvu0X3PPmg5VyZ7qklUVp` with the same zero-dollar settings.
Rollback snapshot: `/root/gf-release-before-cost-ledger-visibility-20261124`.
Sources: [Google Gemini deprecation schedule](https://ai.google.dev/gemini-api/docs/deprecations),
[Google Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing).

### Historical costs visible in admin — 2026-11-24

The admin cost card now shows a separate current-standard-tariff comparison for
legacy token records that were written with `$0`, plus the rolling 30-day
pre-reservation upper bound and count. These comparisons are not added to the
recorded cost, and the labels explain that reserves are not charges and may
remain after a failed call. Build `rEH0A-zJZaLV0A9Yqh_kM` passed standalone
TypeScript checking and the production build (300 static pages) with model
keys blank, automation disabled, and the daily cap at `$0`. Post-deploy the
service is active with zero restarts; home returns HTTP 200 and the two
unauthenticated admin endpoints return HTTP 401. No model calls or tests were
run. Rollback snapshot:
`/root/gf-release-before-admin-historic-costs-20261124`.

### Legacy quota message correction — 2026-11-24

The read-only production event review found a 2026-11-22 run whose start
metadata selected OpenAI with `gpt-5-mini`/`gpt-5-nano`; its later event carried
the legacy `OPENAI_QUOTA_EXHAUSTED` code and the overly definite Turkish text
“OpenAI kredisi tükendi.” The event did not retain HTTP status or vendor
subcode. Other nearby guide events lacked provider metadata. This confirms an
OpenAI quota/limit failure was recorded on an OpenAI-selected run, but does not
establish that prepaid balance was zero. No matching `insufficient_quota`,
`billing_hard_limit`, or HTTP 402/429 detail was retained in the checked
application journal window. The admin dashboard and `scripts/bot-durum.ts` now
rephrase that legacy text as an OpenAI quota/limit error that does not prove a
zero balance. Current article configuration still routes through the Gemini
endpoint, OpenAI is not selected, and automation remains off with a `$0` cap.
Build `Egw_g8jZU7cPxXj0r_vow` passed TypeScript and the 300-page build; service
active with zero restarts, home 200, unauthenticated admin API 401. No model
calls or tests were run. Rollback snapshot:
`/root/gf-release-before-quota-history-panel-20261124`.

### Provider billing error attribution — 2026-11-24

Build `j8cNlSJhf9NDWJdY0rPLK` now retains the provider hostname, HTTP status,
and provider error code when a model endpoint returns HTTP 402. The event says
prepaid credits are exhausted only when the vendor code is
`credit_balance_exhausted`; otherwise it reports that the payment response did
not identify whether balance or a limit caused it. The runtime uses the exact
build directory because Turbopack artifacts resolve modules from their build
root; uploaded article images stay shared at `/opt/gelecekfinans/public/gorseller`.
Build completed with provider keys blank, AI automation off, and a `$0` cap.
After deployment, the service is active with zero restarts; home, `/borsa`,
`/doviz`, a published article, and the news sitemap return HTTP 200; the
unauthenticated provider admin endpoint returns 401. Runtime flags are
`AI_AUTOMATION_ENABLED=false` and `AI_DAILY_SPEND_LIMIT_USD=0`. No model calls
or tests were run. OpenAI account balance remains unknown. Rollback materials:
`/root/gf-release-before-billing-error-attribution-20261124` and
`/etc/systemd/system/gelecekfinans.service.d/20-release.conf`.

### Zero-output cost and failure audit — 30 days through 2026-11-24

The production database contains 122 bot runs: 72 added no article, while 50
runs added 56 articles. Of the 90 runs with a cost summary, all 40 zero-output
runs together account for 421 model responses and the entire `$0.5013` priced
estimate in the ledger. That priced amount is a model-price estimate, not a
vendor invoice; 32 of the 56 GPT-5-mini calls lack provider attribution.

The zero-output cost records also contain 274 unpriced Gemini responses
(342,326 input and 338,764 output tokens). At Google's current standard text
tariff, those tokens compare to about `$0.95`; the account's free-tier and
invoice status are unknown. Another 55 zero-output DeepSeek Cloud responses
have no reliable price. This is separate from the earlier `$3.29` standard-
tariff comparison for all 879 Gemini responses in the 30-day ledger.

The largest recorded zero-output decision reason is missing corroboration:
there are 158 topic blocks for lack of a second independent source across those
runs, after 165 corroboration-judge event records. These are event counts, not
all confirmed model calls. There are 32 zero-output runs without any cost
summary, and 18 without a writer-call reservation event, so the ledger is not
complete enough to reconstruct every run's spend. Eight budget-limit events
and seven legacy OpenAI quota events also appear in zero-output runs; the old
quota text still does not prove that balance was exhausted. The news and guide
timers are inactive, automation is false, and the daily spend cap is `$0`.
There were no model calls during this audit.
Since 2026-11-23 00:00 UTC, production has recorded zero writer-call
reservations, zero cost summaries, and zero per-call spend reservations; the
latest cost event is 2026-11-22 22:06:33 UTC. This matches the disabled
automation flag and the bot timer's explicit early exit.

The same run-level audit found 72 no-article runs out of 122 (59%). Twenty-
three of the 32 no-cost-summary runs still had a `writer_call_reserved` event;
11 of those also recorded corroboration-judge work. That is a telemetry gap,
not proof that every such reservation became a billable request. The newer
pipeline persists a per-request spend reservation before provider calls, but
the historical records cannot be reconstructed from that newer mechanism.

Across 338 corroboration-topic events, the saved verdict arrays contain 747
candidate verdict entries: 66 were marked as the same event and 681 had
`sameEvent=false`. The old binary field conflates a model rejection with a
disabled-automation skip, a budget skip, or a provider failure; the 8.8% raw
true share is not a trustworthy model acceptance rate. There were 158 separate topic blocks for
missing second-source evidence in zero-article runs. The pattern points to
weak candidate matching as the main content-yield issue; do not loosen the
two-source gate. Automation and the news/guide timers remain off while the
candidate feed and matching quality are improved without model calls.

### Current RSS threshold sweep — 2026-11-24

A no-model diagnostic fetched one snapshot from the configured RSS feeds: 355
finance candidates collapsed into 315 unique topics. Deterministic matching
verified 89 topics (28%); 177 topics (56%) had 437 candidate pairs for the
judge at the current 0.20 gray-band floor; 49 (16%) had no judge candidate.
On that same snapshot, raising the floor to 0.24, 0.26, 0.28, 0.30, or 0.32
would reduce candidate pairs to 292, 243, 207, 185, or 163 respectively.

Those reductions are not validated savings: the snapshot contains no ground
truth labels for which removed pairs were genuine corroboration. Historical
judge verdicts have a low acceptance rate, but their similarity scores were
not retained, so they cannot calibrate a safe new floor. The production floor
stays at 0.20; the two-source publication gate remains intact. The measurement
tool can now sweep thresholds on one shared RSS snapshot. TypeScript passed;
the diagnostic made no model calls and no production settings changed.

Build `cfrpjoK7lSduvjowGm68f` deploys safe corroboration telemetry: future judge
events retain title and combined-text similarity scores and the thresholds in
effect, alongside the already-recorded verdict. The prompt and matching
threshold were not changed. The live service still has AI automation off and a
`$0` cap; this instrumentation makes no model calls. TypeScript and production
build passed, and home, `/borsa`, `/doviz`, the news sitemap, and the published
article return 200; the unauthenticated provider endpoint returns 401. The
service is active with zero restarts. Rollback snapshot:
`/root/gf-release-before-judge-similarity-20261124`.

The 24 November follow-up fixes that historical ambiguity for new events:
corroboration results now distinguish `same_event`, `different_event`, and
`not_evaluated`, with a reason for disabled automation, budget skips, and
provider failures. A skipped or failed judge remains a hard gate, but no longer
gets recorded as a model rejection. TypeScript passed; no model calls were made.
Build `9OJf4N5gEncqj12eQsglM` is live. The service is active with zero
restarts; home, article, market pages, and news sitemap return 200; the
unauthenticated provider endpoint returns 401. Automation remains off and the
daily limit remains `$0`. Rollback snapshot:
`/root/gf-release-before-tristate-judge-20261124`.

The no-model RSS measurement was rerun on 24 November with explicit per-feed
success/failure reporting. All 30 configured feeds fetched successfully,
yielding 354 finance candidates and 314 near-unique topics: 89 deterministic
matches, 175 gray-band topics (433 pairs at the 0.20 floor), and 50 with no
judge candidate. Lowering the diagnostic floor to 0.18 or 0.16 would expose 493
or 532 pairs respectively (60 or 99 more); 182 or 191 topics would have a
candidate. This is a possible future call-volume increase, not a validated
setting change.

One observed likely miss is the same-day Cumhuriyet and Sözcü coverage of SGK
control medical examinations: their titles scored 0.16, below the current
floor, while the articles carry the same expert and core event details. A
third feed also covered the subject. This is evidence that the 0.20 floor can
miss real corroboration, but a single positive example does not justify
lowering it; the larger pair-count increase has no labeled false-positive set.
The production threshold and two-source publication gate remain unchanged.
The diagnostic made zero model calls and changed no production settings.

On 24 November, the production writer gained a first-class Gemini provider.
The existing DeepSeek-named configuration is normalized to Gemini when its
endpoint host is generativelanguage.googleapis.com or its model is a Gemini
model. This corrects future quota attribution while preserving the existing
key, endpoint, and models; no production credentials were changed. The
OpenAI-only opt-in lock and the $0 spend guard remain in force. Build
m3mwytVSTviqYmQw7yHb is live, the production configuration resolves to Gemini
2.5 Flash, and automation remains disabled. No model calls were made during
the release. The account billing balance and legacy quota-event vendor remain
unknown; see gemini-provider-normalization-2026-11-24.md for release evidence.

The next RSS-only threshold comparison and manually reviewed same-event misses
are recorded in
[corroboration-threshold-delta-2026-11-24.md](corroboration-threshold-delta-2026-11-24.md).

### Model request boundary recheck — 2026-11-24

A source sweep for OpenAI/Anthropic SDK construction and model request calls
found the provider clients and request sites in `lib/bot/writer.ts`; no direct
provider SDK request was found elsewhere under `app/`, `lib/`, or `scripts/`.
Each OpenAI Responses, Anthropic Messages, and Gemini/DeepSeek-compatible
request branch records its attempt through `recordCallAttempt` immediately
before the SDK request. That function persists a maximum-cost reservation via
`reserveModelSpend`; the guard rejects a zero cap, unknown model price, or
incomplete same-day history. Live process environment still has automation
`false` and daily cap `$0`. This was a static source check; no model request or
test suite was run.
