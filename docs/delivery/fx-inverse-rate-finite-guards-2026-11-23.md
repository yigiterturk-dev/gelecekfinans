# Frankfurter ters kur hesaplamalarında sonluluk kontrolü

Frankfurter TRY-bazlı serilerindeki sayısal oranlar ters çevrilerek TRY paritesi üretiliyor. Sağlayıcı yanıtı sonlu ve pozitif olsa bile aşırı küçük bir sayı ters çevrildiğinde `Infinity` oluşabilir; yuvarlama da geçersiz veya sıfır oran üretebilir. Ters kur ve yuvarlama artık her aşamada doğrulanıyor. Tarih alanları da gerçek ISO takvim tarihleri olmalı. Kullanılamayan parite boş bırakılıyor; değişim tutarı/yüzdesi de yalnızca sonlu sonuçsa gösteriliyor. Aynı kontroller hub, tekil kur ve tarihçe yollarında kullanılıyor.

Kaynak incelemesi ve `git diff --check` yapıldı. Test/build veya dış sağlayıcı isteği çalıştırılmadı.
