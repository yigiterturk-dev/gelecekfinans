# Haftalık haber taslağı sınırı — 2026-11-23

Otomatik haber cron'u artık günlük ayar ve cron sıklığı ne olursa olsun,
İstanbul haftasında en fazla üç bot haber taslağı oluşturabilir. Kota
yayındaki ve incelemedeki tüm bot haberlerini sayar; doğrulayıcı reddiyle
kurtarılan taslaklar da hesaba dahildir. Sınır dolduğunda cron `skipped`
yanıtı verir. Editörün yönetim panelinden başlattığı üretim bu zamanlama
kapısından geçmez. Haber cron'u, rehber cron'u ve yönetim üretim isteği aynı
PostgreSQL tabanlı altı dakikalık atomik kilidi paylaşır; böylece ortak AI
bütçesi aynı anda iki akış tarafından tüketilmez. Kilit alınamazsa üretim
başlamaz. Cron yanıtları özel/önbelleksizdir.

Verification: code-path review and `git diff --check` only. No tests, build, or
production deployment were run.
