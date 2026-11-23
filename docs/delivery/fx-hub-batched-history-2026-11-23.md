# Döviz hub tarihsel kur isteği — 2026-11-23

`getAllFx()` her paritenin önceki iş günü kurunu ayrı ayrı istiyordu. Hub artık
önceki referans kurlarını Frankfurter v2 `/rates` zaman serisi üzerinden tek
istekte alıyor; quote bazında güncel gözlem tarihinden önceki en son satırı
seçiyor ve TRY bazlı oranı döviz/TRY biçimine ters çeviriyor. Kur detay
sayfalarındaki tekil sorgu yolu değişmedi.

API biçimi Frankfurter'ın resmi çoklu quote ve tarih aralığı dokümantasyonuna
göre kullanıldı: https://frankfurter.dev/javascript/ .

Doğrulama: kaynak incelemesi ve `git diff --check`. Test, build, canlı API
karşılaştırması ve tarayıcı kontrolü çalıştırılmadı.
