# Cumhuriyet ziynet altını metal karşılığı düzeltmesi

Altın fiyat veri modeli çeyrek ve tam ziynet altınının nominal ağırlığını saf altın miktarı gibi kullanıyordu. Bu nedenle spot temelli fiyat, nominal ağırlığın %91,66 saflık oranını da içermesi gerekirken yüksek hesaplanıyordu. Model şimdi Darphane ziynet ağırlıklarını 916,6 milyem ile çarpıyor; sayfa ve hesaplayıcı sonucu açıkça tahmini metal karşılığı diye adlandırıyor.

Sayfaya, hesaplayıcıya ve SSS'ye çeyrek ziynet (1,754 g) ile tam ziynet (7,016 g) ve Cumhuriyet sikkesi (7,216 g) ayrımı eklendi. Sikke primi, işçilik, makas ve kurum marjının hesapta bulunmadığı açıkça belirtiliyor.

Kaynak: [Darphane Cumhuriyet Altını Üretimi](https://www.darphane.gov.tr/cumhuriyet-altini-uretimi) — nominal ağırlık ve 22 ayar bilgileri.

Değişiklikler: `lib/market.ts`, `lib/market-faq.ts`, `components/calculators/GoldCalculator.tsx`, `app/altin/page.tsx`, `app/altin/[type]/page.tsx`, `app/araclar/[tool]/page.tsx`.

Doğrulama: `git diff --check` çalıştırıldı; test/build çalıştırılmadı.
