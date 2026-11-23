# OVP 2027–2029 kaynak ve tahmin düzeltmesi — 2026-11-23

Canlı OVP haberinde, 2027 yıl sonu TÜFE tahminini “%22 veya %21” diye iki farklı oranla sunup bunun kaynaklar arasında değiştiğini ileri süren bir paragraf vardı; resmi Strateji ve Bütçe Başkanlığı programı bu çelişkiyi desteklemiyor. SBB'nin 2027–2029 temel göstergeler tablosu 2027 için %21, 2028 için %13,5 ve 2029 için %9 yıl sonu TÜFE tahmini veriyor. Yazı bu resmi tahminlere göre düzeltildi ve doğrudan SBB PDF bağlantısı kaynaklara eklendi. Program oranlarının gerçekleşme değil tahmin olduğu açıkça belirtildi. Aynı yanlış aralık AI özeti içinden de kaldırıldı.

Ayrıca SBB resmi programının ek tablosuyla makaledeki ana patika kontrol edildi: büyüme için 2026 gerçekleşme tahmini %3,3; 2027 %4,2; 2028 %4,6; 2029 %5,0. Makaledeki bu değerler resmi tabloyla uyumlu. İstihdam düzeyi 2026'daki 32,579 milyondan 2029'da 34,711 milyona çıktığından yaklaşık 2,1 milyon ilave istihdam ifadesi de tabloyla uyumlu.

Kaynaklar:
- [SBB — OVP 2027–2029 resmi PDF](https://www.sbb.gov.tr/wp-content/uploads/2026/09/Orta-Vadeli-Program-2027-2029.pdf)
- [Resmî Gazete — 6 Eylül 2026 tarihli OVP onay kararı](https://www.resmigazete.gov.tr/fihrist?mukerrer=1&tarih=2026-09-06)

Önce üretim yedeği 2026-11-23 06:05 CET'te tazelendi; ağsız PostgreSQL 17 konteynerinde `pg_restore --exit-on-error` başarıyla tamamlandı (214 makale, 14 tablo). Önceki hedef satırı `/root/gf-ovp-before-20261123.json` dosyasında 0600 izinle korundu. Yalnızca `content` ve `aiExtras` alanları güncellendi; status PUBLISHED kaldı, `automationMeta` ve `autoPublished` değişmedi. Kanıt/verification işareti eklenmedi. Hiçbir model/API çağrısı yapılmadı.

Canlı URL HTTP 200 ve ikinci istekte cache HIT döndürdü; yeni resmi kaynak, %21 tahmini ve FAQ/özet render edilmiş HTML'de doğrulandı. Servis active ve `NRestarts=0`. Test çalıştırılmadı. İddia düzeyindeki editoryal inceleme sürüyor.
