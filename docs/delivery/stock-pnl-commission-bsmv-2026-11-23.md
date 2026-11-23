# Hisse kâr/zarar aracında komisyon BSMV'si

Hisse kâr/zarar hesaplayıcısı artık iki yöndeki komisyonu ve komisyon üzerinden alınan BSMV'yi net sonuç ve alış maliyetine dahil ediyor. BSMV alanı varsayılan olarak %5 geliyor ve kullanıcı tarafından değiştirilebiliyor; diğer kurum ücretleri ve saklama masrafları kapsam dışında.

Rehber örneği hesaplayıcıyla eşitlendi: 1.000 adet, 10 TL alış, 12 TL satış ve her yönde %0,2 komisyon için komisyon 44 TL, BSMV 2,20 TL, maliyet 10.021 TL, net kâr 1.953,80 TL; getiri net kâr / alış maliyeti tanımıyla %19,50.

Oran dayanağı: [Gelir İdaresi Başkanlığı özelgesi](https://gib.gov.tr/mevzuat/kanun/436/ozelge/31960) aracılık komisyonlarının BSMV'ye tabi olduğunu; [Garanti BBVA Pay Piyasası Risk ve Fiyat Bilgilendirme Formu](https://www.garantibbva.com.tr/content/dam/public-website/pdf/sozlesmeler/tr/2025/pay-piyasasi-urun-risk-ve-fiyat-bilgilendirme-formu-aralik-2025.pdf) formdaki BSMV'ye tabi ücret ve komisyonlarda %5 oranını bildiriyor. Bu örnek kurum oranını varsayılan yapar; kullanıcıya kendi tarifesini kontrol etmesi söylenir.

Değişiklikler: `components/calculators/StockPnlCalculator.tsx`, `lib/tool-guides.tsx`, `app/araclar/[tool]/page.tsx`.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
