# Makale tarihleri İstanbul saat dilimi

Yayın ve güncelleme tarihleri artık sunucunun yerel saat dilimine bağlı kalmadan `Europe/Istanbul` ile biçimleniyor. UTC'de gece saatlerinde kaydedilen bir makalenin Türkiye'deki yayım günü bir gün geri görünmüyor.

Doğrulama: tarih biçimleme seçenekleri kaynak üzerinden incelendi; `git diff --check` temiz. Test/build çalıştırılmadı.
