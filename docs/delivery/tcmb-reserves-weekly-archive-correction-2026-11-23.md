# TCMB 13 Kasım 2026 rezerv verisi — 2026-11-23

`merkez-bankasi-rezervleri-159-milyar-dolar-oldu` yazısındaki haftalık toplam ve bileşen rakamları resmi verilerle tutarlıydı; ancak görünür kaynaklar üçüncü taraf haber/finans siteleriydi, metin tekrarlıydı ve “rezerv” ifadesinin brüt rezerv olduğu net değildi.

Yazı 13 Kasım haftasına ait arşiv olarak yeniden düzenlendi. TCMB’nin resmi toplam, döviz ve altın rakamları tabloya alındı. Brüt resmi rezerv varlıklarının net veya swap hariç net rezerv olmadığını belirten kapsam notu eklendi. Üçüncü taraf yıllık karşılaştırmalar çıkarıldı, iki doğrudan TCMB kaynağı eklendi ve `aiExtras` temizlendi.

Öncesinde tam PostgreSQL yedeği `/opt/gelecekfinans-db/yedek/gf-20261123-before-reserves-article-fix.dump`, önceki satır `/root/gf-reserves-before-fix-20261123.json` (0600) olarak saklandı. DB güncellemesi başarılı oldu. Canlı URL HTTP 200 / `x-nextjs-cache: HIT` verdi; yeni başlık, brüt/net kapsam notu ve doğrudan TCMB kaynakları görüldü.

Kaynaklar: [TCMB — Haftalık Para ve Banka İstatistikleri](https://tcmb.gov.tr/wps/wcm/connect/tr/tcmb%2Btr/main%2Bmenu/istatistikler/parasal%2Bve%2Bfinansal%2Bistatistikler/haftalik%2Bpara%2Bve%2Bbanka%2Bistatistikleri), [TCMB — Uluslararası Rezervler ve Döviz Likiditesi, 13 Kasım 2026](https://www.tcmb.gov.tr/wps/wcm/connect/8192e55e-5e96-491d-aaad-8d5f893e0f1e/URDL_Geli%C5%9Fmeleri.pdf?CACHEID=ROOTWORKSPACE-8192e55e-5e96-491d-aaad-8d5f893e0f1e-pRdZish&MOD=AJPERES).
