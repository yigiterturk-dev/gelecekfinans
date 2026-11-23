# Halka arz talep tutarı hesaplayıcısı

## Değişiklik

- `/halka-arz` rehberine pay fiyatı ve tam sayı lot miktarıyla brüt talep tutarını hesaplayan etkileşimli araç eklendi.
- Araç dağıtım veya getiri tahmin etmiyor; aracı kurum masrafı, blokaj ve iade koşullarının değişebileceğini belirtiyor.
- Mevcut hesaplayıcı stilleri kullanıldı; hesaplama tarayıcıda yapılır.

## Doğrulama

- Next.js 16 Server/Client Component yönergesi incelendi; etkileşimli hesaplayıcı ayrı Client Component olarak bağlandı.
- `git diff --check` temiz. Test, build veya tarayıcı QA çalıştırılmadı.
