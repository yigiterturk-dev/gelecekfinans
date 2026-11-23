# Son dakika yazım bütünlüğü

Yeni duyuru oluşturma artık eski aktif kaydı kapatma ve yeni kaydı oluşturma adımlarını tek veritabanı transaction'ında yapıyor; oluşturma başarısız olursa mevcut duyuru aktif kalıyor. POST ve DELETE gövdeleri katı biçimde doğrulanıyor. Bozuk veya yanlış biçimli DELETE isteği artık `{}` gibi değerlendirilip toplu kapatma yapmıyor; bilerek gönderilen `{}` ise arayüzdeki “Tümünü Kapat” eylemini koruyor. TTL 1–168 saat, bağlantı URL'si HTTP(S) ile sınırlı. Yönetim yanıtları önbelleğe alınmıyor.
