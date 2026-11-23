# Emekli zammı hesaplayıcısı varsayılanları

## Değişiklik

- Eski 16.881 TL maaş varsayılanı kaldırıldı. Araç, kullanıcının gerçek kök aylığını girmesini bekliyor; alan etiketi ve erişilebilir adı bunu belirtiyor.
- TÜİK/EVDS verisi yoksa keyfî %10 zam varsayımı kaldırıldı; oran boş kalıyor ve veri yokluğu açıklanıyor.
- Hesaplanan zam, yeni kök aylık veya yıllık fark sayısal sınırı aşarsa sonuç gösterilmiyor.

## Kaynak ve doğrulama

- [TBMM — en düşük emekli aylığının artırılması](https://tbmm.gov.tr/Haber/en-dusuk-emekli-ayliginin-artirilma-20260715073300): Temmuz 2026 ödeme döneminden itibaren yasal alt ödeme tutarı 23.552 TL'ye çıkarıldı. Bu ödeme tabanı, aracın hesaplaması için gereken kişinin kök aylığıyla aynı şey olmadığı için sabit maaş varsayımı kaldırıldı.
- Kaynak yokluğu ve çıktı doğrulama yolları kod üzerinden gözden geçirildi; `git diff --check` çalıştırıldı.
- Test/build çalıştırılmadı.
