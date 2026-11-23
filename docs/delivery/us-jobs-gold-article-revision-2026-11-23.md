# ABD istihdamı ve altın haberi revizyonu — 2026-11-23

6 Eylül tarihli yazı, 4 Eylül’de ilk açıklanan +162 bin tarım dışı bordro artışını ve aynı gün spot altında bildirilen düşüşü güncellemesiz bırakmış; gram altın, gümüş, dolar endeksi ve teknik seviyeler hakkında kaynağı belirsiz iddialar içeriyordu.

BLS'nin revizyon zinciri resmî arşivlerden kontrol edildi: 4 Eylül ilk açıklama +162 bin; 2 Ekim revizyonu +133 bin; 6 Kasım revizyonu +186 bin. Başlık ve içerik, 23 Kasım itibarıyla son yayımlanmış +186 bin verisini ve tarihleri ayıracak şekilde değiştirildi. Dünya Gazetesi'nin aynı günkü haberindeki yaklaşık 4.469 → 4.390 dolar spot altın gözlemi tarihli piyasa aktarımı olarak korundu; güncel fiyat veya tek başına nedensellik kanıtı olmadığı belirtildi. Doğrulanamayan ek piyasa ve teknik iddialar ile `aiExtras` kaldırıldı. Makale PUBLISHED kaldı; otomatik yayın metadata'sı değiştirilmedi.

Öncesinde PostgreSQL yedeği `/opt/gelecekfinans-db/yedek/gf-20261123-before-nfp-article-fix.dump` konumuna alındı. Önceki hedef satır `/root/gf-nfp-article-before-fix-20261123.json` içinde 0600 izinle saklandı. Yalnızca `title`, `meta`, `content`, `source`, `aiExtras` ve `updatedAt` değiştirildi.

Canlı URL HTTP 200 ve `x-nextjs-cache: HIT` döndürdü; yeni başlık, ilk/ara/son istihdam değerleri ve temizlenmiş özet alanı doğrulandı. Ana sayfa HTTP 200. Servis yeniden başlatılmadı. Test çalıştırılmadı; OpenAI API çağrısı yapılmadı.

Kaynaklar: [BLS — Ağustos ilk açıklaması](https://www.bls.gov/news.release/archives/empsit_09042026.htm), [BLS — Ekim revizyonu](https://www.bls.gov/news.release/archives/empsit_10022026.htm), [BLS — Kasım revizyonu](https://www.bls.gov/news.release/empsit.htm), [Dünya Gazetesi — 4 Eylül altın haberi](https://www.dunya.com/ekonomi/altin-neden-dustu-gram-altin-dusecek-mi-altin-yukselir-mi-haberi-838764).
