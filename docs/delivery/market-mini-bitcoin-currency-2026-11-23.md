# Piyasa özetinde Bitcoin birimi — 2026-11-23

MarketMini, CoinGecko `/api/kripto` ve `/api/fiyatlar` yanıtlarından TRY cinsinden
Bitcoin fiyatı alıyordu; satır ise `BTC/USD` ve `$` gösteriyordu. Başlık ve
sembol, bu iki kaynağın `vs_currency=try`/`vs_currencies=try` yanıtlarıyla
eşleşecek şekilde `BTC/TRY` ve `₺` olarak düzeltildi.

Canlı doğrulama: üretim build'i başarılı; `/api/kripto` HTTP 200, 20 varlık
döndürdü ve Bitcoin kaydında kaynak güncelleme zamanı vardı. Widget'ta fiyat
`BTC/TRY` ve `₺` olarak gösteriliyor.

Bitcoin verisi gösterildiğinde widget, CoinGecko'nun istediği görünür
“Data provided by CoinGecko” atfını API sayfasına bağlantıyla sunuyor:
[CoinGecko API attribution guidance](https://www.coingecko.com/en/api).
