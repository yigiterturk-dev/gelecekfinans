# `aiExtras` kanıt etiketi sızıntısı — kök neden ve kalıcı düzeltme

## Bulgu

Makale gövdesi oluşturulurken `stripEvidenceMarkers` çalışıyordu; ancak AI özetleri ve SSS cevapları aynı temizlikten geçmeden `aiExtras` alanına kaydediliyor ve makale sayfasında hem metin hem FAQ JSON-LD olarak kullanılıyordu. Bu yüzden `[ev-3-publisher:…]` gibi dahili kanıt kimlikleri okuyucuya ulaşabiliyordu. Veritabanı taramasında 5 yayımlanmış makalede bu markerlar bulundu. Kaynak kimliklerinde `.com` olduğunda eski regex ayrıca etiketi kaçırabiliyordu.

## Düzeltme

- `lib/bot/writer.ts`: özet, etki ve SSS metinleri hem normal dönüşte hem incelemeye düşen taslaklarda kaydedilmeden temizleniyor.
- `lib/articles.ts`: veritabanından okunan AI alanları yeniden temizleniyor; bu, eski satırlara ve FAQ JSON-LD'ye de koruma sağlıyor.
- `lib/bot/quality.ts`: marker regex'i alan adlarındaki noktaları da kapsıyor.
- Üretim veritabanında 5 yayımlanmış satırın tam görüntüsü 0600 izinli dosyada saklandı; noktalı kaynak etiketi nedeniyle ikinci kez işlem gören tek satırın da ayrı snapshot'ı alındı. Bu beş yayımlanmış satır ve marker içeren tek arşiv satırı temizlendi. Son tüm-durum taramasında `aiExtras` ve gövde marker sayısı 0.

## Canlı doğrulama

İzole üretim kaynağında Next.js build başarılı oldu; `AI_AUTOMATION_ENABLED=false` ve OpenAI/DeepSeek/Anthropic/Gemini API anahtarları boş olarak çalıştırıldı. Canlı build kimliği `5PNQdlLzVtFZHxt1rFtDF`. Dokuz ilgili makale URL'sinin tamamı HTTP 200 döndürdü ve HTML taramasında `ev-*-publisher` sayısı her biri için 0 çıktı. Servis `active`, `NRestarts=0`.

Test paketi çalıştırılmadı; kullanıcı test istemedi. Bu çalışma sırasında OpenAI API çağrısı yapılmadı.
