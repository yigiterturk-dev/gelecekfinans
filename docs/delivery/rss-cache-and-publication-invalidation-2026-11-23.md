# RSS önbelleği ve yayın değişiklikleri

RSS çıktısı 10 dakikalık Next.js önbelleğine alındı. Yönetim panelinden makale düzenleme, silme veya toplu yayın durumunu değiştirme işlemleri makale sayfası, ana sayfa, kategori listeleri, RSS ve sitemap uçlarının yenilenmesini tetikliyor. Böylece yayın akışındaki değişiklikler eski dağıtım çıktılarında TTL sonuna kadar beklemiyor.

Doğrulama: Next.js yerel Route Handler ve `revalidatePath` belgeleri incelendi; `git diff --check` temiz. Test/build çalıştırılmadı.
