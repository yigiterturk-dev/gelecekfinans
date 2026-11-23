# Piyasa uç noktası kaynak çağrıları

`/api/fiyatlar` TCMB, endeks, kripto ve geçmiş kur isteklerini artık birlikte başlatıyor; altın kaynağı da Yahoo altın fiyatını TCMB kuruyla eşzamanlı alıyor. Böylece yavaş bir bağımsız kaynağın beklenmesi diğerlerinin başlangıcını geciktirmiyor. TCMB XML'indeki boş/geçersiz alış veya satış değerleri artık fiyat olarak istemciye taşınmıyor.

Doğrulama: kaynak akışı incelendi; `git diff --check` temiz. Test/build veya canlı TTFB ölçümü yapılmadı.
