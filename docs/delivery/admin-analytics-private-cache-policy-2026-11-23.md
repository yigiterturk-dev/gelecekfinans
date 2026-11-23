# Admin Analytics yanıtı önbelleğe alınmasın

Yönetici oturumu gerektiren Analytics API'sinin hem başarılı hem `401` yanıtları `Cache-Control: private, no-store` gönderiyor. Böylece site trafiği ve makale performansı verileri paylaşımlı veya tarayıcı HTTP önbelleğinde tutulmuyor.
