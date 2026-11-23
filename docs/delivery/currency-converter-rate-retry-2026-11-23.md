# Döviz çeviricide kur yükleme hatasını yeniden deneme — 2026-11-23

Kur API'si başarısız olduğunda çevirici hata ile yükleme tamamlanmış gibi
aynı durumu gösteriyor ve yeni istek için sayfa yenilemeye zorluyordu. Yükleme,
başarı ve hata durumları ayrıldı; kur gerektiren dönüşümde eksik kur için
erişilebilir bir “Yeniden Dene” düğmesi eklendi. TRY–TRY dönüşümü dış kur
gerektirmediği için API beklenirken de çalışır. Miktar hatası, kur hatasından
ayrı gösterilir.

Doğrulama: kaynak incelemesi ve `git diff --check`. Test veya build çalıştırılmadı.
