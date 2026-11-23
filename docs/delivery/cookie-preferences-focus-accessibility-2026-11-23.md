# Çerez tercihleri klavye odağı

Gizlilik tercihleri dialog'u başlık ve açıklama kimlikleriyle ilişkilendirildi; non-modal durumu açıkça belirtildi. Footer'daki tercih düğmesiyle açıldığında panel ilk reddet düğmesine odaklanıyor; seçim paneli kapattığında, açan kontrol hâlâ sayfadaysa klavye odağı ona geri veriliyor. Var olan tercih değiştirilip sayfa yenilendiğinde yenileme akışı korunuyor.

Değişiklik: `components/CookieConsent.tsx`.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
