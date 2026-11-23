# Emekli zammı hesaplayıcısında yıllık fark etiketi

## Değişiklik

- “Yıllık Fark” etiketi “Yıllıklandırılmış Fark” oldu.
- Sonuç altında hesabın aylık fark × 12 olduğunu ve zam ayına bağlı fiilî takvim yılı toplamını göstermediğini açıklayan not eklendi.
- Araç açıklaması ve yöntem tablosu aynı ayrımı kullanıyor.

## Gerekçe

Araç her zam dönemi için aylık artışı 12 ile çarpar. Özellikle Temmuz zammında bu değer, yıl sonuna kadar ödenecek gerçek toplamla karıştırılabilirdi.

## Doğrulama

- Formül, `PensionRaiseCalculator.tsx` içindeki `incEstimate * 12` hesabıyla karşılaştırıldı.
- `git diff --check` temiz.
- Test ve build çalıştırılmadı.
