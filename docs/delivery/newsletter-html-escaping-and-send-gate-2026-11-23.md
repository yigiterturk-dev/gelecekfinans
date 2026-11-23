# Bülten HTML güvenliği ve gönderim kapısı

Digest e-postasındaki makale başlığı, kategori, özet, URL ve abonelik bağlantısı HTML bağlamına göre kaçışlanıyor; slug URL bileşeni olarak kodlanıyor. Admin gönderim gövdesi katı Zod şemasıyla doğrulanıyor, konu satırları sessizce kesilmek yerine reddediliyor. Resend veya abonelik gizli anahtarı yoksa kampanya kaydı oluşturulmadan `503` dönülüyor. Admin yanıtları önbelleğe kapalı.
