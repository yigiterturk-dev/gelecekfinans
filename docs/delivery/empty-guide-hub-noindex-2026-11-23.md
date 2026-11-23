# Boş rehber hub'ında noindex — 2026-11-23

`/rehber` metadata'sı artık `getGuides()` sonucuna göre robots yönergesi belirliyor: hiç yayınlanmış rehber yoksa `noindex, follow`, içerik varsa `index, follow`. `getGuides()` React `cache()` ile sarıldı; metadata ve sayfa gövdesi aynı render sırasında aynı argümanla çağırdığında sorgu sonucu paylaşılır. Boş sayfanın canlı veri ve araç bağlantıları kalır; yalnızca içerik listesi boşken arama indeksine alınmaz.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
