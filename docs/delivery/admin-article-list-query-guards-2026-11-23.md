# Yönetim makale listesi filtre ve önbellek sınırları

Makale listesindeki durum, kategori, arama ve sayfa parametreleri sorgudan önce doğrulanıyor. Geçersiz parametreler `400` döndürüyor; sayfa numarası 1–5.000 aralığıyla sınırlı. Yönetim listesi yanıtları `private, no-store` olarak işaretleniyor. Başlık araması, Türkçe karakterleri normalize eden slug üzerinde de arama yaptığı için `İ/i`, `ş/s`, `ğ/g` gibi yazım farklarını yakalıyor.
