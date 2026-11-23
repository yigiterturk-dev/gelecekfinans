# Görsel onarım cron kilidi — 2026-11-23

## Değişiklik

`app/api/bot/image-repair/route.ts`, görsel üretmeden ve makale seçmeden önce ana bot pipeline'ının kullandığı `bot:publishing-pipeline` PostgreSQL kilidini alıyor. Kilit doluysa `409` ve `Retry-After: 30` dönüyor. Normal yanıtlar, erken çıkışlar ve hatalar dahil her durumda alınan kilit `finally` içinde serbest bırakılıyor.

## Gerekçe

Görsel onarım endpoint'i paylaşılan veritabanı kaydını güncelliyor ve dış görsel sağlayıcısını çağırıyordu; diğer bot cron'larıyla aynı kilidi kullanmıyordu. Aynı makalenin iki kez onarılmasını ve onarımın üretim akışıyla çakışmasını önlemek için ortak kilit eklendi.

## Doğrulama

`git diff --check` çalıştırıldı. Test/build çalıştırılmadı.
