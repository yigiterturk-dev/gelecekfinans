# Zamanlanmış iş ve arama bildirimi maliyet freni — 2026-11-23

## Google Indexing API

Günlük sitemap işi ve haber/rehber yayın akışları sitemap'teki normal sayfaları Google Indexing API'ye gönderiyordu. Google bu API'yi yalnızca `JobPosting` veya `VideoObject` içindeki `BroadcastEvent` yapılandırılmış verisi taşıyan sayfalar için destekliyor: [Google Indexing API kullanım rehberi](https://developers.google.com/search/apis/indexing-api/v3/using-api). GelecekFinans sayfaları bu içerik türünde değil.

Üretim kodundan Google Indexing API istekleri kaldırıldı. `lib/bot/indexing.ts` bir koruma olarak normal makale URL'leri için API isteği yapmadan `unsupported-content` döndürüyor. Sitemap görevi ve haber/rehber yayın akışları IndexNow bildirimini koruyor; manuel `scripts/indeks-bildir.ts` aracı da artık yalnız IndexNow kullanıyor.

Değişiklik izole üretim kopyasında derlendi, TypeScript tamamlandı ve 296 statik sayfa üretildi. Build `iA2EcmpEZiQItnhdvMWxM` canlıya alındı. Ana sayfa HTTP 200, yetkisiz `/api/bot/index-ping` HTTP 401 döndürdü; servis active ve `NRestarts=0`. İzole build sırasında AI otomasyonu false, OpenAI/DeepSeek/Anthropic/Gemini anahtarları boştu. Test çalıştırılmadı; veritabanı değişikliği yapılmadı. Önceki build ve hedef kaynak dosyalar `/root/gf-release-before-indexnow-20261123` altında saklı.

## Bülten cron'u

Canlı `.env.production` içinde hem `RESEND_API_KEY` hem `NEWSLETTER_SECRET` yok. 23 Kasım günlük koşum kaydı iki alıcı ve iki makale için `sent: 0`, `failed: 2` diyordu; hata kaydı mail yapılandırmasının eksik olduğunu gösteriyordu. Resend anahtarı olmadığı için e-posta sağlayıcısına istek gönderilmiyordu, ancak cron gereksiz yere uygulama endpoint'ini çağırıyordu.

`ops/gf-cron.cjs` artık bu iki ayardan biri yoksa bülten endpoint'ine gitmeden `MAIL_NOT_CONFIGURED` uyarı durumu yazar (`httpStatus: null`). Canlıda kontrollü tek koşum bu sonucu verdi; `lastSuccessAt` eski başarılı durum olarak kaldı ve ardışık hata sayısı sıfırlandı. Günlük yerel cron tetikleyicisi duruyor; dış endpoint çağrısı ve e-posta gönderimi yapılmıyor.

## Mevcut maliyet ve çalışma durumu

- `AI_AUTOMATION_ENABLED=false`; seçili provider `deepseek`; news/guide zamanlayıcıları yok ve pasif.
- Image onarım işi günde bir kez çalışıyor; son 7 günde 24 BOT makalesi ve eksik kapak görselli 0 makale bulundu. Bu yol OpenAI model çağrısı kullanmıyor.
- GSC, IndexNow ve yedekleme işleri aktif. GSC işi Search Console verisi/DB işlemi yapıyor; model çağırmıyor. Index işi artık Google Indexing API'ye değil yalnız IndexNow'a gidiyor.
- Son 24 saatin model kullanım defteri, 36 tarihsel OpenAI-model çağrısı ve fiyat tablosuyla **$0.2727 uygulama tahmini** gösteriyor. Bu tutar OpenAI faturası veya bakiye değildir. Hesap bakiyesi bu oturumdan hâlâ okunamıyor.
- Bu incelemede OpenAI API çağrısı yapılmadı.
