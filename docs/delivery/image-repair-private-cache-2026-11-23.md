# Görsel onarım API'sinde özel önbellek başlığı — 2026-11-23

`app/api/bot/image-repair/route.ts` artık yetkisiz, kilit-meşgul, iş bulunamadı, görsel üretilemedi ve başarılı yanıtlarının tümünde `Cache-Control: private, no-store, max-age=0` döndürüyor. Kilit-meşgul yanıtındaki mevcut `Retry-After` başlığı korunuyor. Bu rota makale kimliği ve görsel denetim ayrıntısı döndürdüğünden diğer bot cron'larıyla aynı cache politikasına getirildi.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
