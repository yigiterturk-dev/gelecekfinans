# Hızlı aramayı sunucu tarafına taşıma

**Tarih:** 2026-11-23

`/api/articles` hızlı arama açıldığında son 200 makalenin başlık ve meta listesini istemciye indiriyordu. Arama artık yazılan sorguyu `/api/articles/search` uç noktasına gönderiyor. Uç nokta yayımlanmış makalelerin başlık, meta, anahtar kelime ve kategori alanlarında Türkçe karakterleri normalize ederek arama yapıyor; en fazla sekiz sonucu ve gerekli kapak bilgisini döndürüyor. Arşivdeki tüm yayımlanmış kayıtlar arama kapsamına giriyor.

İstemci sorguyu 200 ms bekletiyor ve sorgu değişince önceki isteği iptal ediyor. Böylece yazım sırasında gereksiz istekler azaltılıyor ve 200 makalelik listeyi indirme ihtiyacı kalkıyor. Yanıt yalnızca kartta gösterilen başlık, kategori, slug ve kapak alanlarını içeriyor; açıklama, anahtar kelime ve kullanılmayan görsel yolu istemciye taşınmıyor. Sonuç bulunmaması, yüklenme, hata/yeniden deneme durumu ve klavye ile seçim korunuyor. Arama yanıtları `private, no-store` olarak işaretlendi; hızlı arama görüntülenme sayacı agregasyonu yapmıyor.

`git diff --check` temiz geçti. Test veya build çalıştırılmadı.
