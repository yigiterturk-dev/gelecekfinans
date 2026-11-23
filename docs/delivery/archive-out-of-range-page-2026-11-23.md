# Arşiv sayfalama sınırı

Arşiv, `sayfa` değerini güvenli pozitif tam sayı olarak ayrıştırır ve mevcut arama/kategori filtrelemesinden sonra sayfa sayısını doğrular. Aralık dışı sayfa artık son sayfayı sessizce göstermiyor; 404 döndürüyor. Query parametreleri Next.js’in `string | string[]` biçimini de kabul ediyor ve arama/filtre girdileri güvenli stringe normalize ediliyor.

Next.js 16 `notFound` rehberi incelendi. `git diff --check` temiz; test/build çalıştırılmadı.
