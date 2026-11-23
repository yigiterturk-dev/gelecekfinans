# Piyasa widget veri durumu — 2026-11-23

MarketMini başlığındaki yeşil nokta veri yokken de sabit yanıyordu. Durum artık
widget'ta gerçekten kullanılabilir bir fiyat bulunmasına ve fiyat taşıyan her
API akışının son başarılı yanıtının üç dakikadan yeni olmasına göre hesaplanıyor.
İlk yüklemede bekleme, fiyat yokken hata, gecikmiş yanıt varken uyarı rengi ve
etiketi gösteriliyor. Bu durum istemcinin API yanıt zamanını izler; sağlayıcının
alıntı zamanını göstermez ve upstream önbelleğinin tazeliğini kanıtlamaz.

Canlı doğrulama: üretim build'i başarılı; servis `active`. Ana sayfa HTTP 200,
`/api/fiyatlar` HTTP 200 ve pozitif fiyat alanları içeriyor. Durum, sağlayıcı
kotasyonunun gerçek zamanlı olduğunu iddia etmiyor.
