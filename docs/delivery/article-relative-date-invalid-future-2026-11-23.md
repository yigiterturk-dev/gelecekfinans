# Haber kartlarında tarih gösterimi

Haber kartlarının göreli tarih yardımcısı artık bozuk tarih değerlerinde `Invalid Date` göstermez; bu durumda `Tarih bilinmiyor` yazar. İlk dakika `0 dk` yerine `Az önce` gösterilir. Gelecek zaman damgaları negatif dakika üretmek yerine takvim tarihiyle gösterilir.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
