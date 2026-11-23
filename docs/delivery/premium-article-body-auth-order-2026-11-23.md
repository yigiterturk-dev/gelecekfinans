# Premium makale API'sinde kimlik doğrulama sırası

Premium gövde uç noktası artık oturumu makale kaydını okumadan önce doğruluyor. Oturumsuz istekler tüm slug değerleri için aynı `401` yanıtını alıyor; böylece başlık slug'ları üzerinden premium/ücretsiz/yok ayrımı dışarıya açıklanmıyor ve yetkisiz istekler makale sorgusu oluşturmuyor.

Yanıtlar (başarılı, hata ve hız sınırı yanıtları) `private, no-store` olarak işaretlendi. Oturum açmış kullanıcılar için mevcut IP tabanlı hız sınırı ve içerik sanitizasyonu korunuyor.
