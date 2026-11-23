# Kategori sayfalarında erişilebilir sayfalama

Kategori sayfa gezintisi artık geçerli sayfayı çevresindeki numaralarla gösterir; yüksek sayfalarda 1–7 arasında takılı kalmaz. Gezinti bölgesine erişilebilir adı ve etkin numaraya `aria-current="page"` eklendi. İlk sayfa bağlantıları temiz kategori URL'sine gider; `?sayfa=1` üretmez.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
