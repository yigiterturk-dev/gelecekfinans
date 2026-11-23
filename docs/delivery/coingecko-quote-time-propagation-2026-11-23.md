# CoinGecko kotasyon zamanını API ve ana sayfaya taşıma

CoinGecko `/coins/markets` satırlarının doğrulanmış `last_updated` değeri artık `/api/kripto` yanıtında korunuyor. Bitcoin için `/api/fiyatlar` Simple Price isteği `include_last_updated_at` ister ve `updatedAt` alanı döndürür. Ana sayfa mini paneli, Bitcoin'in eskilik durumunu artık isteğin tamamlanma saatinden değil, kaynağın kotasyon zamanından değerlendirir; kripto hub da kaynak güncelleme zamanını gösterir.

Test veya derleme çalıştırılmadı.
