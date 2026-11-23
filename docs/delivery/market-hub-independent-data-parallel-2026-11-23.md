# Piyasa sayfalarında bağımsız veri çağrıları

Döviz, altın ve kripto hub sayfaları piyasa verisi ile ilgili makaleleri artık ardışık değil `Promise.all` ile bekliyor. Faiz sayfasında politika faizi, TCMB oranları ve ilgili içerik sorgusu da birlikte başlıyor. Sonuçlar ve önbellek süreleri değişmedi; ilk üretimde ve ISR yenilemesinde toplam bekleme bağımsız çağrıların en yavaşıyla sınırlanıyor.
