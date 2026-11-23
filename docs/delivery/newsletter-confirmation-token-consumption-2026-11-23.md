# Bülten onay bağlantısı tek kullanımlı hale getirildi — 2026-11-23

Onay token'ı daha önce geçerli olduğu 48 saat boyunca tekrar kullanılabiliyor,
bu da eski bir e-posta bağlantısının abonelikten çıkmış bir adresi yeniden
etkinleştirmesine izin veriyordu. Abone kaydında yalnızca güncel token'ın SHA-256
parmak izi tutuluyor; onay işlemi bu parmak izini atomik olarak eşleştirip
geçersizleştiriyor. Abonelikten çıkma ve yönetimden pasife alma, bekleyen token'ı
`revoked` işaretiyle geçersiz kılıyor. Önceki sürümde gönderilmiş, parmak izi olmayan bekleyen
onaylar bir kez kullanılabilen uyumluluk yoluyla tamamlanabilir.

Şema değişikliği `Subscriber.confirmationTokenHash String?` nullable alanıdır;
mevcut kayıtlar için backfill gerekmez. Bu kaynak değişikliği **deploy edilmedi**.
Çalışan sürümden önce PostgreSQL şemasına `npm run db:push` uygulanıp Prisma
istemcisi üretilmeli; uygulama alan olmadan çalıştırılmamalıdır. Sütun senkronu
ve rollout yapılmadığı için canlı abonelik akışı bu turda doğrulanmadı.

Doğrulama: kaynak akışı incelemesi ve `git diff --check`. Test, build veya şema
senkronu çalıştırılmadı.
