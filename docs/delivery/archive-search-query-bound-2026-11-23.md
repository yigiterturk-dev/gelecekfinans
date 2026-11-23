# Arşiv arama sorgusu sınırı — 2026-11-23

Arşiv araması URL'den gelen sorgu metnini uzunluk sınırı olmadan alıyordu.
Arşiv ve hızlı arama alanları 200 karakterle sınırlandı; arşiv sayfası ile
arama fonksiyonu da sunucu tarafında bu üst sınırı uygular. Arşiv sayfası uzun
parametreyi 200 karaktere indirerek aynı sorguyu arayüz ve metadata'da tutarlı
gösterir.

Doğrulama: kaynak incelemesi ve `git diff --check`. Test veya build çalıştırılmadı.
