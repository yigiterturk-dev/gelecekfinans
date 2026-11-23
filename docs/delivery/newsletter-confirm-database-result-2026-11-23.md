# Bülten onay yanıtı kayıt durumuna bağlı

Onay POST'u artık veritabanında hiçbir abone kaydı güncellenmediyse başarı mesajı göstermiyor; silinmiş kayıt için `410` döndürüyor. Veritabanı hatası kullanıcıya genel bir geçici hata sayfası ve `503` olarak yansıyor. Yanıtlar mevcut `no-store`, `no-referrer` ve `noindex` başlıklarını koruyor.
