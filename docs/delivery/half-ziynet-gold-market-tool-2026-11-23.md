# Yarım ziynet altını fiyat ve hesaplama kapsamı

Altın kataloğuna ve hesaplayıcıya Darphane yarım Cumhuriyet ziynet altını eklendi. Fiyat, 3,508 g nominal ağırlığın 916,6 milyem saflıkla çarpılıp gram spot değeriyle hesaplanıyor. Piyasa panosunda da aynı metal karşılığı gösteriliyor. Ortak altın standardı sabitleri artık hem sunucu fiyat modelinde hem piyasa panosunda kullanılıyor; iki yüzeyin dönüşüm oranları ayrı ayrı kopyalanmıyor. İçerik, 3,608 g olan yarım sikke altının farklı olduğunu ve mağaza alış/satış fiyatlarının prim ve makas içerebileceğini açıkça belirtiyor.

Etkilenen yüzeyler: `/altin` kataloğu, `/altin/yarim-altin` detay ve sitemap rotası, altın hesaplayıcısı, ana piyasa panosu. Rehber verisi [Darphane Cumhuriyet Altını Üretimi](https://www.darphane.gov.tr/cumhuriyet-altini-uretimi) tablosundan doğrulandı.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
