# Bülten onay bağlantısı yanıt gizliliği

Çift onay sayfası artık `no-store` ve `noindex` başlıkları gönderiyor, ayrıca `Referrer-Policy: no-referrer` kullanıyor. E-postadaki imzalı onay token'ı yanıt önbelleklerine veya sonraki gezinme isteğinin Referer başlığına taşınmıyor.

Doğrulama: başlıkların başarılı ve başarısız onay HTML yanıtlarını kapsadığı incelendi; `git diff --check` temiz. Test/build çalıştırılmadı.
