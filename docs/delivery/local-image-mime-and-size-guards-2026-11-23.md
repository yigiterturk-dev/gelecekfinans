# Yerel görsellerde MIME ve boyut korumaları

## Değişiklik

- JPEG, PNG, WebP, GIF ve AVIF içerikleri kendi uzantılarıyla saklanıyor.
- Yüklenen ve uzak kaynaktan indirilen görsellerin MIME türü desteklenen listeyle eşleştiriliyor; dosya imzası da türle uyumlu olmalı.
- AVIF doğrulaması `ftyp` kutusunun boyutunu ve marka alanlarını denetliyor.
- Yerel depolama 25 MiB üstünü reddediyor. Uzak yanıt gövdesi belleğe akış halinde okunuyor ve sınır aşılırsa indirme kesiliyor.
- Uzak kaynakta Content-Type eksik veya desteklenmiyorsa varsayılan JPEG varsayımı yapılmıyor.

## Doğrulama

- Yükleme rotasının mevcut 8 MiB sınırı ve izinli türleriyle depolama katmanı uyumlu.
- Kaynak değişikliği gözden geçirildi ve `git diff --check` çalıştırıldı.
- Test/build çalıştırılmadı.
