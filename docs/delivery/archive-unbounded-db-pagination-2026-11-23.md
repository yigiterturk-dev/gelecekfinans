# Haber arşivi doğrudan veritabanından sayfalanıyor

Arşivin tarih/kategori görünümü artık en yeni 500 makaleyi belleğe alıp dilimlemek yerine toplamı sayıyor ve yalnızca istenen 24 satırı veritabanından alıyor. Bu, eski makalelerin sayfalama dışında kalmasını önlüyor ve her arşiv isteğinde yüzlerce gereksiz kaydı taşımıyor. Kategori arşiviyle aynı 5 dakikalık cache etiketi kullanılıyor; makale yönetimindeki değişiklikler her iki listeyi de geçersiz kılıyor. Metin araması da Türkçe karakter normalizasyonunu koruyarak tam yayımlanmış makale kümesini tarıyor; yalnızca arama sonuçlarının gösterilecek sayfası için görüntülenme verisi alınıyor.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
