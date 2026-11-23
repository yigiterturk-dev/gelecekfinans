# Admin Analytics yükleme ve hata durumları

Analytics istemcisi artık HTTP hatalarını ve beklenmeyen yanıt biçimlerini istatistik gibi render etmiyor. `401` yanıtında yeniden giriş bağlantısı gösteriliyor; diğer hatalar erişilebilir hata durumuna düşüyor. Dönem değiştirildiğinde önceki istek iptal edildiği için geç gelen eski yanıt yeni dönemin verisini ezemiyor.
