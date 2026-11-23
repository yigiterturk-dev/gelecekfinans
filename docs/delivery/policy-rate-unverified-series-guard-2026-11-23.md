# Politika faizi için doğrulanmamış EVDS serisini devreden çıkarma

`/faiz` hem EVDS adapter'ını hem TCMB'nin resmi faiz tablosu okuyucusunu çağırıyor ve EVDS değerini tablo okuyucusunun üstüne yazıyordu. `lib/tcmb-evds.ts` ise `TP.APIFON4` serisinin canlı yanıtla doğrulanmadığını ve doğrulamadan sayfaya bağlanmaması gerektiğini belirtiyordu. Kamu sayfası artık canlı oranları yalnızca aynı resmi TCMB tablosundan doğrulanan politika ve gecelik oran seti halinde gösteriyor; kaynak okunamazsa tarihli statik referansa dönüyor. EVDS adapter'ı manuel seri doğrulama aracı olarak kalıyor ve yorumları ile yardımcı betik mesajı bu kullanıma göre güncellendi.

TCMB'nin 22 Ekim 2026 tarihli resmi duyurusu politika faizini %36, gecelik borç alma oranını %34,5 ve gecelik borç verme oranını %39 olarak belirtiyor: https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB%2BTR/Main%2BMenu/Duyurular/Basin/2026/DUY2026-45. Kod değişikliği bu oranları sabitlemiyor; canlı TCMB tablosu okunamazsa sayfa tarihli referans tablosunun statik olduğunu açıkça söylüyor.

Kaynak incelemesi ve `git diff --check` yapıldı. Test, build veya canlı sayfa kontrolü çalıştırılmadı.
