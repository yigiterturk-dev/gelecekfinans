# Yöntem tablosu formül tutarlılığı

## Değişiklik

- Kredi formülündeki anapara, aylık faiz ve vade değişkenleri tanımlandı; dahil olmayan KKDF, BSMV ve dosya masrafları korundu.
- Temettü formülü, yıllık brüt tutar, stopaj sonrası net ve yüzde biçimindeki yıllık brüt verimi açıkça tanımlıyor.
- Hisse formülündeki alış/satış kalemleri “brüt işlem tutarı” olarak tanımlandı; komisyon ve BSMV'nin ayrıca düşüldüğü netleşti.
- Yüzde alanlarının formüllerde 100'e bölünerek kullanıldığı açıkça gösterildi; bileşik faiz oranının girdiden ondalık değere çevrildiği belirtildi.
- Hisse komisyonu için binde, BSMV için yüzde birimi formül satırında belirtildi.

## Gerekçe

Formüller uygulama koduyla karşılaştırıldı. Kredi aracı aylık faiz ve ay cinsinden vade ister; temettü aracı yıllık hisse başı brüt temettüden brüt yüzde verim hesaplar.

## Doğrulama

- `LoanCalculator.tsx` ve `DividendCalculator.tsx` ile formül ve değişkenler karşılaştırıldı.
- `git diff --check` temiz.
- Test ve build çalıştırılmadı.
