# Bültenlerde tek tıkla abonelikten çıkma

Günlük bülten gönderimleri artık her alıcıya özgü imzalı URL ile `List-Unsubscribe` ve RFC 8058 `List-Unsubscribe-Post` başlıklarını iletiyor. Abonelikten çıkma GET isteği artık veritabanını değiştirmiyor; posta güvenlik tarayıcılarının bağlantıyı önceden açması kullanıcıyı listeden çıkaramıyor. GET, imzalı token doğrulanmışsa açık bir onay formu gösteriyor. Onay formu ve posta sağlayıcısının one-click POST isteği, içerik türüne göre urlencoded veya multipart gövdeyle gönderiliyor; rota 4 KiB sınır uyguluyor, imzalı token ve tam `List-Unsubscribe=One-Click` alanını doğruluyor ve yönlendirme yapmadan 200 dönüyor.

Dayanak: [IETF RFC 8058](https://www.rfc-editor.org/rfc/rfc8058.html) tanımlı POST başlık ve gövdesi; [Resend gönderim yönergeleri](https://resend.com/blog/microsoft-bulk-sending-requirements-2025) POST işleme ve GET sayfası davranışı.

Değişiklikler: `lib/mail.ts`, `app/api/newsletter/unsubscribe/route.ts`.

Doğrulama: `git diff --check` temiz. E-posta gönderimi, test veya build çalıştırılmadı.
