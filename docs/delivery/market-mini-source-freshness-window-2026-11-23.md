# Ana sayfa piyasa verisi gecikme eşiği

Bitcoin satırı CoinGecko'nun `last_updated` alanını kullanıyor; diğer piyasa satırları son başarılı `/api/fiyatlar` yanıt zamanını kullanıyor. CoinGecko, çoğu uç noktanın yaklaşık 1–5 dakikada yenilendiğini belirtiyor. Bu nedenle 6 dakika eşiği normal önbellek aralığında sahte gecikme uyarısını azaltıyor. Diğer fiyat satırlarında bu, upstream kotasyon zamanını kanıtlamaz. [CoinGecko veri yenileme aralığı](https://support.coingecko.com/articles/3626854421-how-often-does-data-get-updated-or-refreshed).

Canlı doğrulama: üretim build'i başarılı ve servis `active`; ana sayfa HTTP 200.
Eşik yalnız CoinGecko kaynağındaki kotasyon zamanını değerlendirir; diğer fiyat
akışlarının upstream tazeliğini ispatlamaz.

23 Kasım'daki canlı incelemede CoinGecko `429` hız sınırı ve 33 saniyelik `Retry-After` döndürdü; sonraki upstream isteği `200` ve 20 varlık verdi. `/api/kripto` artık son başarılı listeyi süreç belleğinde en fazla 6 dakika tutuyor. Upstream hata verirse bu liste `X-Data-Stale: true` ile sunuluyor; içindeki `last_updated` zaman damgası korunarak widget gecikmeyi açıkça gösterebilir. Bellekte iyi yanıt yoksa API boş 503 döndürüp sağlayıcının güvenli sayısal `Retry-After` değerini iletir. Üretim build ve son endpoint smoke kontrolü bu düzeltme dağıtıldıktan sonra tamamlanmalı.
