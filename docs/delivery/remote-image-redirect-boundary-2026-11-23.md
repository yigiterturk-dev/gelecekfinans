# Uzak görsel indirme yönlendirme sınırı — 2026-11-23

## Değişiklik

`storeRemoteImage` indirmeden önce URL'yi ayrıştırıp yalnızca kimlik bilgisi içermeyen HTTPS adreslerini kabul ediyor. `fetch` için otomatik yönlendirme kapatıldı. Hedef sunucu yönlendirme döndürürse indirme başarısız sayılır ve görsel üretim hattı mevcut yerel markalı kapak yedeğine döner. Kullanılmayan `allowExternalFallback` parametresi kaldırıldı; yardımcı artık hiçbir durumda dış URL'yi başarı sonucu olarak döndürmüyor.

## Gerekçe

Uzak medya sağlayıcısının verdiği görsel adresi HTTPS ile başlasa bile HTTP istemcisinin yönlendirmeyi izlemesi, sunucunun ikinci bir hedefe istek göndermesine neden olabilirdi. Bu değişiklik yönlendirme üzerinden hedef değiştirilmesini engeller.

## Doğrulama

`git diff --check` çalıştırıldı. Test/build çalıştırılmadı.
