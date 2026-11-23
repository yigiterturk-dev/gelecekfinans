# Altın hesaplayıcısında fiyatı yeniden deneme

Altın fiyatı isteği başarısız olduğunda kullanıcı artık sayfayı yenilemeden aynı araçtan yeniden deneyebilir. Her istek ayrı `AbortController` ile yönetilir; bileşen kapanınca devam eden istek iptal edilir. Bekleme durumu yeniden deneme sırasında da gösterilir.

Test veya derleme çalıştırılmadı.
