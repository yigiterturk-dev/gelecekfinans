# Makale görsel URL giriş doğrulaması — 2026-11-23

Makale oluşturma ve güncelleme API'leri `imageUrl` için artık ortak `isSafeArticleImageUrl` doğrulamasını kullanıyor. Boş değerler ve tek `/` ile başlayan site içi yollar geçerli; HTTP(S) adreslerinde kullanıcı/parola bilgisi kabul edilmiyor. `javascript:`, `data:`, `blob:` ve ağ yolu biçimindeki `//host/...` girdileri reddediliyor. Mevcut harici HTTP(S) görselleri ile Vercel Blob HTTPS URL'leri desteklenmeye devam ediyor.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
