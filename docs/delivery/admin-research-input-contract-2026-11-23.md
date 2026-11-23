# Admin araştırma API'si giriş sözleşmesi

Araştırma araması artık boş veya 200 karakteri aşan sorguları reddediyor. Taslak üretiminde JSON ve başlık/özet alanları katı biçimde doğrulanıyor; istemci artık backend'in kullanmadığı, doğrulanmamış kaynak alanlarını göndermiyor. Google News, bağımsız kaynak doğrulama ve üretim hatalarının ham exception metinleri API yanıtına sızmıyor. Araştırma yanıtları `private, no-store`.
