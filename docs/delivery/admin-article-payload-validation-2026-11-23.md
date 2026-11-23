# Yönetim makale uçlarında gövde doğrulaması

Makale oluşturma ve düzenleme uçları artık bozuk JSON'u `400` ile karşılıyor, alanları katı Zod şemalarıyla doğruluyor ve başlık, açıklama, metin, kaynak ile görsel URL boyutlarına sınır koyuyor. PATCH boş gövdeyi ve bilinmeyen alanları reddediyor; premium ve yayın durumu alanları da artık gevşek tür dönüşümü yerine açık türlerle kabul ediliyor.

Değişiklikler `app/api/admin/articles/route.ts` ve `app/api/admin/articles/[id]/route.ts` dosyalarında.
