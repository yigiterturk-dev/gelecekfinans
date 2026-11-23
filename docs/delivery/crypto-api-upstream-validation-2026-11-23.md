# Kripto API yanıtı doğrulaması

CoinGecko yanıtı artık arayüze aktarılmadan önce gerekli alanları doğrulanarak normalleştiriliyor: geçersiz fiyatlı kayıtlar eleniyor, oran ve sparkline değerleri sonlu pozitif sayılarla sınırlandırılıyor, simge/metin uzunlukları kesiliyor ve logo adresleri HTTPS ile sınırlandırılıyor. Geçerli kayıt kalmazsa API yanıtı önbelleğe alınmayan hata durumuna dönüyor. Ticker'da logo bulunmadığında boş `src` üretilmiyor; tekrar eden ticker içindeki logo dekoratif işaretleniyor.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
