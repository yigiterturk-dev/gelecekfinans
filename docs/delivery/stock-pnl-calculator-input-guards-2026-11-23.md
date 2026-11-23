# Hisse kâr/zarar hesaplayıcısı giriş korumaları

## Değişiklik

- Hisse miktarı artık pozitif tam sayı olmalı; kesirli hisse adedi sessizce hesaplanmıyor.
- Alış/satış toplamları, komisyonlar, net kâr ve getiri oranı kontrol ediliyor; taşan sonuçlar gösterilmiyor.

## Doğrulama

- Geçerli miktar, kesirli miktar ve taşma durumları formül akışı üzerinden gözden geçirildi.
- `git diff --check` çalıştırıldı. Test/build çalıştırılmadı.
