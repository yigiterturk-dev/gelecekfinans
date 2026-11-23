# Döviz çeviricide referans tarihi ve sonuç sınırı

Döviz çevirici seçilen para birimlerinin referans tarihlerini gösteriyor ve bilgilendirme metni Frankfurter kaynağını ve günlük referans verisi olduğunu belirtiyor. Kur yanıtı geçerli pozitif sayılar ve gerçek ISO tarihleri olarak doğrulanıyor; aşırı tutar hesaplamayı sonlu sayı sınırının dışına taşırsa sonsuz değer gösterilmek yerine anlaşılır bir mesaj veriliyor.

Doğrulama: API yanıt alanları ve hesap akışı kaynak üzerinden incelendi; `git diff --check` temiz. Test/build çalıştırılmadı.
