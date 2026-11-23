# Kredi hesaplayıcısı giriş ve taşma koruması

## Değişiklik

- Vade ayı `parseInt` ile aşağı yuvarlanmıyor; yalnızca 1–600 aralığındaki tam sayı kabul ediliyor.
- Anüite hesabı pozitif kuvvet yerine iskonto faktörüyle yapılıyor; çok yüksek değerlerde ara sonuç taşarsa taksit/toplam gösterilmiyor.
- Faiz sıfırken faizsiz eşit taksit sonucu korunuyor.

## Doğrulama

- Sıfır faiz, pozitif faiz, küsuratlı vade ve taşma durumları formül ve doğrulama akışı üzerinden incelendi.
- `git diff --check` çalıştırıldı. Test/build çalıştırılmadı.
