# Ana sayfa piyasa verisi gecikme eşiği

Ana sayfa mini paneli CoinGecko kotasyon zamanını kullanıyor. CoinGecko genel API’sinin normal yenileme/önbellek aralığı 1–5 dakika olduğundan “gecikmiş” durumu 3 dakika yerine 6 dakikadan sonra gösteriliyor. Böylece kaynağın normal önbellek penceresi panelde sahte gecikme uyarısı üretmiyor.

Canlı doğrulama: üretim build'i başarılı ve servis `active`; ana sayfa HTTP 200.
Eşik yalnız CoinGecko kaynağındaki kotasyon zamanını değerlendirir; diğer fiyat
akışlarının upstream tazeliğini ispatlamaz.
