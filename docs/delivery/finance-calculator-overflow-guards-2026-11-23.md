# Finans hesaplayıcılarında taşma koruması

## Değişiklik

- Kredi, bileşik getiri ve enflasyon hesaplarında girdiler sonlu olsa bile ara/sonuç değeri sayısal sınırı aşarsa `Infinity` veya `NaN` artık sonuç olarak gösterilmiyor.
- Kredi vadesi tam sayı ay olarak doğrulanıyor ve anüite formülü pozitif kuvvetin taşmasını önleyen iskonto faktörü biçimine geçirildi.
- Bileşik getiri ve enflasyon araçlarında hesap sonucu gösterilemediğinde kullanıcıya sayısal sınır uyarısı veriliyor.

## Doğrulama

- Formüller ve sonuç kontrolleri kaynak üzerinden gözden geçirildi; `git diff --check` temiz.
- Test/build çalıştırılmadı.
