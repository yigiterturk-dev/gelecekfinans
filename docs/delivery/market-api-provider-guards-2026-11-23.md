# Piyasa API sağlayıcı korumaları — 2026-11-23

`/api/fiyatlar` dış çağrıları için süre sınırları ve HTTP durum kontrolleri
eklendi. Yahoo Finance grafik istekleri `User-Agent` gönderiyor; bu başlık
eksik olduğunda Yahoo 429 verdiği için proje içindeki diğer piyasa adaptörüyle
aynı davranışa getirildi. Sağlayıcıdan kapanış verisi gelmediğinde değişim
oranı artık `0%` gibi görünmüyor; null bırakılıyor.

`/api/kripto` CoinGecko yanıtını doğruluyor, timeout kullanıyor ve sağlayıcı
hatasını kısa süreli başarılı boş yanıt gibi önbelleğe almıyor. MarketMini bu
yanıtta `ok` kontrol ettiği için önceki fiyatı koruyup gecikme durumunu
hesaplayabilir.

`/api/fiyatlar` hiçbir kullanılabilir fiyat alamazsa artık boş yanıtı 60 saniye
önbelleğe almıyor (`Cache-Control: no-store`); en az bir geçerli fiyat varsa
mevcut kısa paylaşımlı önbellek süresi uygulanıyor.

Doğrulama: kaynak incelemesi ve `git diff --check`. Test, build ve dış sağlayıcı
çağrısı çalıştırılmadı.
