# Altın hesaplayıcısında kaynak güncellik bilgisi

Altın fiyatı hesaplayıcısı API yanıtındaki kaynak zamanlarını koruyup sonuç altında ayrı gösteriyor: altın kotasyonunun güncelleme zamanı ve USD/TRY günlük referans tarihi. Yahoo altın yanıtı `regularMarketTime`, CoinGecko yedeği `last_updated_at` sağladığında altın zamanı görüntülenir; yoksa bunun kaynaktan gelmediği belirtilir. Tarih/saatler Europe/Istanbul saat diliminde biçimlendirilir.

Test veya derleme çalıştırılmadı.
