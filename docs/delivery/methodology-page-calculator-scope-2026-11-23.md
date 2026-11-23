# Yöntem sayfasında hesap kapsamı düzeltmesi

## Değişiklik

- Kredi yöntem satırı KKDF, BSMV ve dosya masraflarının dahil olmadığını belirtiyor.
- Hisse K/Z formülü, alış ve satış komisyonlarını ve bu komisyonların BSMV'sini ayrı ayrı açıklıyor.
- Genel açıklama, araçların varsayılan oran ve kapsamlarını kendi sayfalarında belirttiğini; bazı kesintilerin değiştirilebildiğini, bazılarının kapsam dışı olduğunu söylüyor.

## Gerekçe

Yöntem sayfası daha önce tüm kesintilerin kullanıcı tarafından girildiğini iddia ediyordu. Kredi hesaplayıcısı KKDF/BSMV'yi dahil etmiyor; hisse ve temettü hesaplayıcıları ise oran alanlarında varsayılan değer sunuyor. Yeni metin uygulamayla uyumlu.

## Doğrulama

- Kapsam ve formüller `LoanCalculator.tsx`, `StockPnlCalculator.tsx`, `DividendCalculator.tsx` ile karşılaştırıldı.
- `git diff --check` temiz.
- Test ve build çalıştırılmadı.
