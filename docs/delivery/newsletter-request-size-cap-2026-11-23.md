# Bülten abonelik isteği boyut sınırı

`POST /api/newsletter` artık JSON gövdesini `req.json()` ile sınırsız belleğe almıyor. İçerik uzunluğu başlığı erken reddediliyor, ayrıca başlık olmasa veya yanıltıcı olsa da stream 8 KiB sınırında kesiliyor. Fazla büyük gövde 413; eksik/bozuk JSON 400 döndürüyor. Abonelik formunun küçük e-posta ve tercih verileri bu sınırın altında kalır.

Değişiklik: `app/api/newsletter/route.ts`.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
