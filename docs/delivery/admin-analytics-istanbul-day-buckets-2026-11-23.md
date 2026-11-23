# Analytics günlük grafiği Türkiye gününe göre

Yönetim analitiği günlük görüntüleme grafiği artık Postgres oturum saat diliminin `DATE_TRUNC` sonucuna bağlı değil. UTC saklanan zaman damgaları sorguda `Europe/Istanbul` yerel gününe dönüştürülüyor ve API `YYYY-MM-DD` etiketini metin olarak döndürüyor; istemci bunu tekrar UTC tarihine çevirmiyor.
