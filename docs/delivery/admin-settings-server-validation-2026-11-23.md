# Site Ayarları API sunucu doğrulaması

PATCH gövdesi artık Zod şemasıyla doğrulanıyor: bilinmeyen alanlar, bozuk JSON, yanlış türler, biçimsiz GA4/AdSense kimlikleri, geçersiz slot ID'leri ve sınır dışı otonomi sayıları veritabanına yazılmadan `400` ile reddediliyor. Geçerli kısmi güncellemeler destekleniyor; tüm yanıtlar önbelleksiz kalıyor.
