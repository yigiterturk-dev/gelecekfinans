# Yönetici görsel yükleme gövde sınırı

## Değişiklik

- Dosya türü ve 8 MiB dosya sınırından önce multipart istek gövdesi artık akış halinde en fazla 9 MiB okunuyor.
- Content-Length daha büyükse istek erkenden 413 ile reddediliyor; başlık yoksa veya yanıltıcıysa akış sınırı aşımında kesiliyor.
- Sınırı geçen gövde `formData()` ayrıştırıcısına verilmediği için dosya kontrolünden önce sınırsız gövde belleğe alınamıyor.
- Depolama hatalarının iç istisna metni API yanıtında açığa çıkmıyor; ayrıntı sunucu günlüğüne yazılıyor.

## Doğrulama

- Route Handler'ın Web Request tabanlı davranışı yerel Next.js 16 belgeleriyle karşılaştırıldı.
- `git diff --check` çalıştırıldı. Test/build çalıştırılmadı.
