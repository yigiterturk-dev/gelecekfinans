# Döviz hub tek zaman serisi isteği — 2026-11-23

`getAllFx()` artık güncel kuru ve önceki iş günü karşılaştırmasını iki sıralı Frankfurter çağrısından değil, son 14 takvim gününü kapsayan tek `base=TRY` zaman serisi isteğinden çıkarıyor. Her para biriminde en yeni tarih güncel referans, ondan önceki en yeni gözlem karşılaştırma kuru olarak kullanılıyor; ters kur, yuvarlama, yüzde değişim ve `updatedAt` çıktısı korunuyor. `getFx()` ile tekil parite sayfalarının akışı değişmedi.

Doğrulama: mevcut `getFxPreviousRates()` kodundaki Frankfurter `from`/`to` sözleşmesi referans alındı; `git diff --check` temiz. Test/build çalıştırılmadı.
