# Abone yönetimi PII ve gövde korumaları

Abone listesi ve mutation yanıtları `private, no-store` olarak işaretlendi. GET/PATCH/DELETE admin isteklerine IP tabanlı hız sınırı eklendi. PATCH ve DELETE gövdeleri strict Zod şemasıyla doğrulanıyor; bozuk JSON, eksik/yanlış türde alan veya bilinmeyen alan Prisma'ya ulaşmıyor. Olmayan abone kaydı için mutation `404`, diğer veritabanı hataları için genel `500` dönüyor.
