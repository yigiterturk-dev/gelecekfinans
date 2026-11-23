# Arama sonuçlarında kapak görseli açıklaması

Arama API'si artık her kapak için doğru alt metin ve temsili görsel bilgisi döndürüyor. Arama sonuçlarında gerçek kapaklar haber başlığını, kategori yedeği kapaklar ise görselin temsili olduğunu bildiriyor ve küçük bir “TEMSİLİ” rozeti taşıyor. Böylece gerçek kapaklara yanlışlıkla temsili alt metin verilmesi ve yedek illüstrasyonların etiketsiz görünmesi önlendi.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
