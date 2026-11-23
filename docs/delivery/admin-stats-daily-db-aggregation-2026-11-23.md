# Yönetim grafiği için günlük DB agregasyonu

`GET /api/admin/stats` günlük seriyi üretmek için seçilen dönemdeki tüm `PageView` kayıtlarını Node.js belleğine çekiyordu. Gün sayısı en fazla 30 iken satır sayısı sınırsız büyüyebildiğinden, tarih filtresi aynı kalacak şekilde günlük `DATE_TRUNC` ve `COUNT` işlemi PostgreSQL'e taşındı. API yanıtı aynı `{ date, count }` biçimini korur; uygulama belleğine artık en fazla her gün için bir özet satırı gelir.

Değişiklik: `app/api/admin/stats/route.ts`.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
