# Bülten kayıt POST yanıtlarında özel önbellek politikası — 2026-11-23

`/api/newsletter` artık başarılı onay yanıtı dahil tüm POST sonuçlarında `Cache-Control: private, no-store, max-age=0` döndürüyor. Gövde boyutu, e-posta doğrulaması, yapılandırma, gönderim ve genel hata yanıtları ortak başlığı kullanıyor; rate-limit yanıtlarında `Retry-After` korunuyor. Böylece abonelik işlemi yanıtları tarayıcı veya paylaşılan proxy önbelleğinde tutulmuyor.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı; e-posta gönderimi tetiklenmedi.
