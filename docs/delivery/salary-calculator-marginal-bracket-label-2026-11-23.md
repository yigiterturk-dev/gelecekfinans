# Maaş hesaplayıcısı: vergi dilimi açıklaması

## Değişiklik

- Aylık tabloda “Dilim” sütunu “Ay Sonu Dilimi” olarak adlandırıldı.
- Açıklama metni, oranın ay sonu kümülatif matrahın ulaştığı marjinal oran olduğunu ve o ayın tüm matrahına tek oran uygulanmadığını belirtiyor.

## Gerekçe

Eski başlık, gösterilen oranı o ay hesaplanan verginin tamamına uygulanan oran gibi yorumlatabilirdi. Hesaplama kümülatif yıllık tarifeyi kullandığından arayüz bu ayrımı belirginleştiriyor.

## Kaynak kontrolü

- GİB 2026 gelir vergisi tarifesi: https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fgelir-vergisi-tarifeleri%2Fgelir-vergisi-tarifesi-2026.pdf
- Çalışma ve Sosyal Güvenlik Bakanlığı 2026 asgari ücret bilgisi: https://www.csgb.gov.tr/poco-pages/asgari-ucret/

Resmî kaynaklardaki 2026 tarife eşikleri ve asgari ücret tutarları mevcut hesaplayıcı sabitleriyle uyumlu bulundu.

## Doğrulama

- `git diff --check -- components/calculators/SalaryCalculator.tsx docs/delivery/salary-calculator-marginal-bracket-label-2026-11-23.md` temiz.
- Test ve build çalıştırılmadı.
