# Kategori arşivinde tüm sayfalara erişim

Kategori sayfası artık makaleleri son 200 genel haberle sınırlamak yerine veritabanından kategori filtresiyle sayfalı alıyor. Toplam haber sayısı ayrı bir sayım sorgusuyla bulunuyor; ekranda yalnızca ilgili 20 kart ve bu kartların görüntülenme sayacı yükleniyor. Böylece kategoride 200'den eski içerikler de sayfalamada erişilebilir.

İlgili haber şeritleri de veritabanından yalnızca istenen sayıda en yeni kategori kaydını alıyor. `git diff --check` temiz; test/build çalıştırılmadı.
