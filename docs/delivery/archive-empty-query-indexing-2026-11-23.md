# Arşiv boş sorgu indeksleme kararı — 2026-11-23

`/arsiv` metadata'sı artık ham `q` parametresinin varlığı yerine `queryValue()` ile normalize edilmiş arama sorgusuna bakıyor. Boşluk içeren veya tekrarlı `q` parametreleri arama sayfası üretmediği için ilk arşiv sayfasını yanlışlıkla `noindex` yapmıyor; gerçek sorgular ve ikinci/sonraki sayfalar noindex kalıyor.

Doğrulama: karar dalı `query` ve `page` değişkenleriyle eşleşiyor; `git diff --check` temiz. Test/build çalıştırılmadı.
