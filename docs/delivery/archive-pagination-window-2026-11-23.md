# Arşiv sayfalama penceresi — 2026-11-23

Arşiv yedinci sayfadan sonra da sayfalar sunuyordu, ancak numaralı bağlantılar
hep 1–7'yi gösterdiği için aktif sayfa görünmüyordu. Sayfa bağlantıları artık
geçerli sayfanın çevresinde kayan, en fazla yedi sayfalık bir pencere gösteriyor.
Boş, geçersiz ve negatif `sayfa` parametreleri ilk sayfaya normalize ediliyor;
metadata ve içerik aynı normalizasyonu kullanıyor. Aktif sayfa ve kategori
bağlantıları ayrıca `aria-current` ile ekran okuyuculara bildiriliyor.

Doğrulama: kaynak incelemesi ve `git diff --check`. Test, build ve tarayıcı
kontrolü çalıştırılmadı.
