# Haftalık rehber üretim sınırı — 2026-11-23

Rehber cron'u artık `GUIDE_COUNT_PER_RUN` değerini haftalık üst sınırı aşmak
için kullanamıyor. İstanbul saatine göre pazartesi başlayan haftada, durumu
taslak veya yayınlanmış olan bot rehberleri sayılıyor; toplam iki yeni rehbere
ulaşıldığında cron üretim yapmadan `skipped` yanıtı veriyor. Böylece
doğrulayıcı itirazıyla kurtarılıp incelemede bekleyen rehberler de kota içinde
kalıyor. Paylaşılan PostgreSQL tablosundaki atomik, altı dakikalık kilit haber
cron'u, rehber cron'u ve yönetim üretim isteğini sıraya alıyor; kilit alınamazsa
üretim başlamıyor. Cron yanıtları ayrıca özel ve önbelleksiz başlık taşıyor.

Verification: code-path review and `git diff --check` only. No tests, build, or
production deployment were run.
