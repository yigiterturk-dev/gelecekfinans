# Yönetim ayarlarında hata durumunda varsayılanla yazmayı engelle

Public render'lar için `getSettings()` veritabanı kesintisinde güvenli varsayılanlara düşmeye devam ediyor. Yönetim API'si artık `getSettingsStrict()` kullanıyor: okuma hatası `503` ile görünür, PATCH de mevcut kayıt okunamazsa varsayılanlarla birleştirip yazmıyor. Ayar birleştirme eksik `adSlotIds` alt alanlarını da varsayılanlardan tamamlıyor.
