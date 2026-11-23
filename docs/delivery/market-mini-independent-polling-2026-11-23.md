# Piyasa widget bağımsız veri yenileme — 2026-11-23

MarketMini iki API isteğini tek `Promise.all` ile bekliyordu; bir uçtaki ağ veya
JSON hatası, diğerinin geçerli yanıtının da atılmasına neden oluyordu. İstekler
artık ayrı sonuçlandırılıyor ve geçerli yanıt diğer kaynaktan bağımsız olarak
ekrana uygulanıyor. Yeni yenileme, önceki turun tamamlanmasından 60 saniye sonra
başlıyor; yavaş turlarda eşzamanlı polling oluşmuyor. Bileşen ayrılırken zamanlayıcı
temizleniyor ve bekleyen istek iptal ediliyor.

İsteklere 15 saniyelik iptal sınırı eklendi; hiçbir akış yanıt vermezse widget
yükleme durumunda sonsuza dek kalmaz. Canlı doğrulama: üretim build'i başarılı,
servis `active`, ana sayfa HTTP 200; `/api/fiyatlar` ve `/api/kripto` sırasıyla
HTTP 200 verdi.
