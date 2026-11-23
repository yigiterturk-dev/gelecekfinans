# Sayfa görüntüleme endpoint'i istek sınırı

Herkese açık `/api/track` isteği artık JSON gövdesini 1 KiB ile sınırlıyor ve akış boyutunu okuma sırasında kontrol ediyor. Kaydedilen değer yalnızca 512 karaktere kadar iç yol olabilir; protokol-relative URL, sorgu/fragment, ters eğik çizgi ve kontrol karakterleri reddediliyor. Böylece analitik sayacı büyük gövde veya keyfi URL metniyle şişirilemiyor.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
