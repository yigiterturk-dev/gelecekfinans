# Döviz API'sinde sağlayıcı hatası yanıtı

`/api/doviz`, kullanılabilir bir kur döndüremediğinde artık başarılı `200 {}` yanıtı üretmiyor. Tamamen boş sonuç ve beklenmeyen hata durumları `503` ve `Cache-Control: no-store` döndürüyor; böylece geçici sağlayıcı arızası başarılı yanıt gibi algılanmıyor veya CDN'de önbelleğe alınmıyor.

En az bir pozitif, sonlu kur varsa kısmi yanıtlar mevcut önbellek politikasıyla sunulmaya devam ediyor. Dönüştürücü mevcut hata yolunda dönüşümü kapatıyor ve başarısız veri çekimini kullanıcıya geçersiz kur olarak göstermiyor.
