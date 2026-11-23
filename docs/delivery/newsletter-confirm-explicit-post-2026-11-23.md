# Bülten onayı tarayıcı önizlemesinde tetiklenmesin

Double opt-in bağlantısının `GET` isteği artık aboneliği etkinleştirmiyor; onay sayfasında kullanıcıya açık bir düğme gösteriyor. Veritabanındaki `active=true, confirmed=true` güncellemesi yalnızca token doğrulamasından geçen `POST` isteğinde yapılıyor. E-posta güvenlik tarayıcıları bağlantıları önceden açsa bile onay durumunu değiştiremiyor.

GET ve POST yanıtları mevcut `no-store`, `no-referrer` ve `noindex` başlıklarını kullanıyor. Token imzası ve son kullanma denetimi korunuyor.
