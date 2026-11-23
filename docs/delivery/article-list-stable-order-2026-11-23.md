# Kararlı makale listesi sıralaması — 2026-11-23

Yayın tarihi eşit olan makaleler önceki sorgularda veritabanının belirsiz
eşitlik sırasına bırakılıyordu. Özellikle `skip` kullanan arşiv ve kategori
sayfalarında kayıtlar sayfalar arasında yer değiştirebilir, yinelenebilir veya
atlanabilirdi. Tüm yayın listesi, arşiv araması ve rehber sorgularına benzersiz
ikinci sıralama ölçütü olarak `id DESC` eklendi. Yayın tarihi sırası korunuyor;
eşit tarihli kayıtların sırası artık kararlı.

Doğrulama: kaynak incelemesi ve `git diff --check`. Test veya build çalıştırılmadı.
