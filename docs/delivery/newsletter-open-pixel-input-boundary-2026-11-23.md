# Bülten açılma pikseli giriş sınırı

Kampanya açılma pikseli artık yalnızca 64 karaktere kadar alfasayısal/alt çizgi/tire kampanya kimliği ve `A`/`B` varyantı için veritabanını güncelliyor. GIF yanıtı `noindex` de bildiriyor; yanıtta önbelleği kapatan mevcut başlık korunuyor.

Doğrulama: model kimliği ve mail şablonundaki A/B parametreleriyle eşleştirildi; `git diff --check` temiz. Test/build çalıştırılmadı.
