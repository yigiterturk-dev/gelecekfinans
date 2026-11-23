# Altın hesaplayıcısında sonlu sonuç koruması

Altın API yanıtındaki fiyat artık sayı, sonlu ve sıfırdan küçük değilse kullanılır. Miktar ile çarpım JavaScript sayı sınırını aşarsa sonsuz/bozuk bir değer biçimlendirmek yerine açıklayıcı sonuç mesajı gösterilir.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
