# Ons altın haber düzeltmesi — 2026-11-23

Canlı yazının gövdesi aynı anda 22 Kasım Pazar günü spot fiyatı olarak 3.516 dolar, geçen hafta için hem yüzde 4,62 hem yaklaşık yüzde 9 kayıp, ayrıca kaynak bağlantılarıyla doğrulanmayan Fed açıklaması ve tahvil faizi iddiaları veriyordu. `aiExtras` içindeki özet ve SSS cevaplarında kullanıcıya `[ev-2-publisher:…]` / `[ev-3-publisher:…]` iç kanıt etiketleri de sızıyordu.

Yazı, yalnızca tarihsel veri kaynağında doğrulanabilen COMEX Aralık 2026 altın vadeli kontratının 20 Kasım 2026 kapanışı (3.515,40 dolar; günlük yüzde 4,62 düşüş) üzerine yeniden yazıldı. Spot fiyat olmadığı, verinin güncel kotasyon sayılmaması ve Türkiye'deki gram/fiziki altın getirisini tek başına göstermediği açıklandı. Çelişkili veya doğrulanamayan iddialar çıkarıldı; FAQ ve özet içeren `aiExtras` temizlendi. Makale PUBLISHED ve otomatik yayın metadata'sı korundu.

Öncesinde üretim veritabanı yedeği `/opt/gelecekfinans-db/yedek/gf-20261123-before-ons-article-fix.dump` konumuna alındı. Hedef satırın tam önceki görüntüsü `/root/gf-ons-altin-before-article-fix-20261123.json` dosyasında 0600 izinle saklandı. Yalnızca `title`, `meta`, `content`, `source`, `aiExtras` ve `updatedAt` alanları değiştirildi.

Canlı makale URL'si HTTP 200 döndürdü ve yeni başlığı/gövdeyi sunmaya başladı. Önceki sürümdeki `ev-*` etiketleri artık HTML'de yok. Ana sayfa da HTTP 200 döndü. Servis yeniden başlatılmadı. Test çalıştırılmadı ve bu düzenlemede OpenAI API çağrısı yapılmadı.

Kaynak: [Investing.com Gold Futures tarihsel verileri](https://www.investing.com/commodities/gold-historical-data).
