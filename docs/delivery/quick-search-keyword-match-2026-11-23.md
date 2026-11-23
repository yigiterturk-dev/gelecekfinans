# Hızlı aramada anahtar kelime eşleşmesi — 2026-11-23

`/api/articles` yanıtı yayınlanmış makalelerin `keyword` alanını hızlı arama bileşenine iletiyor. `components/Search.tsx` artık başlık, açıklama ve kategoriye ek olarak bu alanı da arıyor. Böylece modal önerileri arşiv aramasının kullandığı konu anahtar kelimeleriyle tutarlı.

Doğrulama: API alanı `getAllArticles()` listesindeki `keyword` değerinden geliyor; hızlı arama eşleşmesi dört alanı kapsıyor. `git diff --check` temiz. Test/build çalıştırılmadı.
