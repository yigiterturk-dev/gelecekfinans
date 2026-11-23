# Bileşik getiri yöntem formülü

## Değişiklik

Yöntem tablosundaki formül, bileşik getiri aracının aylık uygulamasıyla eşitlendi: yıllık nominal oran 12'ye bölünüyor, aylık katkı ay sonunda yatırılıyor ve süre en yakın aya yuvarlanıyor. Sıfır faiz durumu ayrıca belirtiliyor.

## Gerekçe

Eski `A = P × (1 + r)^t` ifadesi etkin yıllık oranla yıllık bileşiklemeyi anlatıyordu. Araç ise her ay `r/12` oranını uyguluyor; bu yüzden gösterilen formül hesaplama sonucuyla aynı değildi.

## Doğrulama

- Formül varsayımları `CompoundCalculator.tsx` içindeki aylık yineleme (`i = r / 12`, ay sonunda `M` eklenmesi) ile karşılaştırıldı.
- `git diff --check` temiz.
- Test ve build çalıştırılmadı.
