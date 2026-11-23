# Arama sonuçlarının ekran okuyucu duyurusu

Arama alanı artık sonuç önerilerini combobox/listbox ilişkisiyle bildiriyor. Klavyeyle seçilen öneri `aria-activedescendant` ve `aria-selected` ile eşleştirildi; böylece ok tuşlarıyla değişen aktif sonucun ekran okuyucuya aktarılması sağlandı.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
