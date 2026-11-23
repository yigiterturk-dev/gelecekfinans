# Eski görsel API sınırları — 2026-11-23

`/api/gorsel` artık senkron `existsSync`/`readFileSync` kullanmıyor. Görsel
kökü ve istenen dosyanın gerçek yolları çözümlenip symlink'in kök dışına
kaçmadığı doğrulanıyor; dizinler reddediliyor ve 25 MiB üzerindeki dosyalar
aktarılmıyor. Yanıta `Content-Length` ve `X-Content-Type-Options: nosniff`
ekleniyor.

Doğrulama: kaynak incelemesi ve `git diff --check`. Test, büyük dosya isteği ve
tarayıcı kontrolü çalıştırılmadı.
