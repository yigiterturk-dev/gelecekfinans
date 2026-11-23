# Tek tıkla abonelikten çıkma DB hata yanıtı — 2026-11-23

RFC 8058 tek tık POST'u, DB güncellemesi hata verdiğinde hata işleyicisine
bırakılıyordu. Uç nokta artık geçici DB hatasında `503`, `Retry-After: 30` ve
`no-store` döndürüyor; başarılı yol doğrudan `200` yanıtını koruyor. Böylece
posta sağlayıcısı başarısız işlemi başarı sanmıyor ve tekrar deneyebiliyor.

Doğrulama: kaynak incelemesi ve `git diff --check`. Test veya build çalıştırılmadı.
