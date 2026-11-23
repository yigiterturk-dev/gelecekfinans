# Abone yönetimi istemci hata durumları

Abone liste bileşeni artık HTTP durumunu ve yanıtın temel şeklini doğruluyor. Filtre değişince önceki GET isteği iptal ediliyor; oturum/servis hatasında boş liste gibi davranmak yerine yeniden deneme ve giriş bağlantısı gösteriliyor. Aktifleştirme ve silme işlemlerinde başarısız API yanıtı görünür hata olarak kalıyor, liste yalnızca başarılı mutation sonrasında yenileniyor.
