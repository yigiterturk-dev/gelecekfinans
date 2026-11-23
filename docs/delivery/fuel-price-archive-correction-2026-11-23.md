# 7 Eylül akaryakıt fiyatları arşiv düzeltmesi — 2026-11-23

Yazı, 7 Eylül 2026 verilerini “güncel” diye sunuyor; İstanbul için tek değer verip bunu İstanbul, Ankara ve İzmir'e genelliyor; 3–5 Eylül fiyatlarını 7 Eylül tablosuyla karıştırıyor ve vergi artışına ilişkin ayrı bir açıklama ekliyordu. Kaynaklar arasında konu dışı TRT altın haberi de vardı.

Başlık ve meta tarihsel arşiv olduklarını açıkça belirtecek şekilde değiştirildi. Şehir tablosu Motor1'in 7 Eylül tarihli, fiyatların Petrol Ofisi'nden alındığını belirten yayınına göre yenilendi. Aynı tarihli İstanbul arşivindeki Petrol Ofisi/Opet listeleriyle fark da not edilerek tek bir İstanbul rakamının tüm dağıtıcı ve bölgeleri temsil etmediği açıklandı. Farklı tarihli karşılaştırma ve doğrulanamayan vergi anlatısı çıkarıldı; FAQ/özet alanı temizlendi. Makale PUBLISHED ve otomatik yayın metadata'sı korundu.

Öncesinde PostgreSQL yedeği `/opt/gelecekfinans-db/yedek/gf-20261123-before-fuel-article-fix.dump` konumuna alındı. Önceki hedef satır `/root/gf-fuel-article-before-fix-20261123.json` içinde 0600 izinle saklandı. Yalnızca `title`, `meta`, `content`, `source`, `aiExtras` ve `updatedAt` değiştirildi.

Canlı URL HTTP 200 ve `x-nextjs-cache: HIT` döndürdü; yeni başlık ve tarihsel içerik doğrulandı. Ana sayfa HTTP 200. Uygulama servisi yeniden başlatılmadı. Test çalıştırılmadı; OpenAI API çağrısı yapılmadı.

Kaynaklar: [Motor1 — 7 Eylül 2026 akaryakıt fiyatları](https://tr.motor1.com/news/807375/akaryakit-fiyatlari-7-eylul-2026/); [İstanbul 7 Eylül fiyat arşivi](https://petrolfiyatlari.com.tr/istanbul-akaryakit-fiyatlari/7-eylul-2026).
