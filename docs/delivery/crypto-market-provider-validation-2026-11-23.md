# Sayfa tarafı CoinGecko piyasa verisi doğrulaması

Kripto detay ve hub sayfaları CoinGecko yanıtını tip beyanıyla doğrudan kullanıyordu; sadece ayrı `/api/kripto` yolu daha önce çalışma zamanı doğrulaması yapıyordu. Ortak sayfa adaptörü artık kimlik ve fiyatı doğruluyor, geçersiz/negatif değişim ve yardımcı fiyat değerlerini `null` bırakıyor, sparkline'ı son 168 geçerli pozitif noktayla sınırlıyor ve tarih damgasını kontrol ediyor. Detay uç noktası beklenen CoinGecko kimliğiyle eşleşmezse sonuç gösterilmiyor; hub en fazla 20 geçerli kaydı döndürüyor.

Kaynak incelemesi ve `git diff --check` yapıldı. Test/build veya dış sağlayıcı isteği çalıştırılmadı.
