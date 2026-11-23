# Haber sitemap noindex filtresi — 2026-11-23

Genel sitemap `automationMeta.seoNoindex === true` makaleleri dışlıyordu; haber
sitemap'i aynı işareti seçmiyor ve bu URL'leri Google News feed'ine ekleyebiliyordu.
News sitemap sorgusu artık `automationMeta` alanını alıp `isSeoNoindex` ile
filtreliyor; böylece sayfanın robots metadata'sı ve iki sitemap'in kapsamı
birbiriyle tutarlı.

Doğrulama: kaynak incelemesi ve `git diff --check`. Test, build, XML üretimi ve
Search Console kontrolü çalıştırılmadı.
