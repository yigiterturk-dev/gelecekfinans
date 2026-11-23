# Kategori sayfalamasında geçersiz sayfa numarası

Kategori arşivi `sayfa` parametresini artık tam sayı ve pozitif sayfa numarası olarak ayrıştırır. Geçersiz metin ilk sayfaya normalize edilir; içerik aralığının ötesindeki sayfalar 404 olur. Metadata, içerik sayısı dışında kalan sayfaları indekslenebilir işaretlemez.

Next.js 16 `notFound` belgesi çağrı yeri ve 404/noindex davranışı için incelendi. `git diff --check` temiz; test/build çalıştırılmadı.
