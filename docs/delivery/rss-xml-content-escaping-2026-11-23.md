# RSS XML içerik kaçışı

RSS başlıkları ve açıklamaları CDATA ile yayımlanırken `]]>` dizisi artık güvenli CDATA sınırı geçişine dönüştürülüyor. Makale slug'ı ve kategori alanları da XML metni olarak kaçışlanıyor; içerik metninin XML yapısını bozması önleniyor.

Doğrulama: CDATA sınır dönüşümü kaynak üzerinden kontrol edildi; `git diff --check` temiz. Test/build çalıştırılmadı.
