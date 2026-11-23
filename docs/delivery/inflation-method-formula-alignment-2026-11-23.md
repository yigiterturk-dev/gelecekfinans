# Enflasyon aracının yöntem formülü

## Değişiklik

Yöntem tablosu artık aracın gerçekten sunduğu iki yönü gösteriyor: geçmiş tutarı dönem kümülatif enflasyonuyla ileri taşımak ve bugünkü tutarı aynı oranla geçmişe çevirmek. Kullanıcının girdiği oran açıkça kümülatif dönem oranı olarak tanımlanıyor.

## Gerekçe

Önceki satır yıllık oranı `n` yıl bileşikleyen ve hesaplayıcıda bulunmayan reel getiri hesabını da içeriyordu. Araçta dönem seçimi veya reel getiri alanı yok; tek kümülatif oran uygulanıyor.

## Doğrulama

- Formüller `InflationCalculator.tsx` içindeki ileri çarpma ve ters bölme işlemleriyle karşılaştırıldı.
- `git diff --check` temiz.
- Test ve build çalıştırılmadı.
