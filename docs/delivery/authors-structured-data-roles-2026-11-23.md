# Yazarlar yapılandırılmış veri rolleri — 2026-11-23

Yazarlar sayfası gerçek yazı işleri sorumlusunu `Person`, ortak imza olan
GelecekFinans Haber Merkezi'ni `Organization` olarak listeliyor. Önceden her
iki varlığa da `jobTitle` ve `worksFor` ekleniyordu. Şimdi kişi için bu iki
özellik korunuyor; haber merkezi kendi açıklaması ve üst kuruluş bağlantısıyla
işaretleniyor. Böylece ortak imza kişiye dönüştürülmüyor.

Alan kapsamı Schema.org tanımlarına göre düzenlendi:
https://schema.org/jobTitle · https://schema.org/Organization .

Doğrulama: kaynak incelemesi ve `git diff --check`. Test, build, yapılandırılmış
veri doğrulayıcısı ve tarayıcı kontrolü çalıştırılmadı.
