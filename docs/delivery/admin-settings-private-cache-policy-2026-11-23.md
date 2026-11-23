# Site Ayarları API önbellek politikası

Yetkili Site Ayarları GET/PATCH yanıtları `private, no-store, max-age=0` döndürüyor. Oturum reddi, hız sınırı ve köken reddi yanıtlarında da önbelleksiz politika korunuyor; yönetim ayarları ara katmanlarda saklanmıyor.
