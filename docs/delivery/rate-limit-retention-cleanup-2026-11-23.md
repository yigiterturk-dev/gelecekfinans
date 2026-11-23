# Paylaşımlı hız sınırı verisi saklama süresi

Paylaşımlı hız sınırı tablosunda IP adresini içeren sayaç anahtarları, `resetAt` geçtikten sonra veritabanında kalıyordu. Sınır penceresi süresi dolmuş satırlar artık paylaşımlı sayaç kullanımı sırasında dakikada en fazla bir kez indeksli `resetAt` alanına göre temizleniyor. Temizlik sorgusu başarısız olsa da asıl hız sınırı çalışmaya devam ediyor.

Gizlilik politikasına, bazı isteklerde IP'nin kısa süreli hız sınırı amacıyla kullanıldığı ve süresi dolan sayaçların otomatik temizlendiği eklendi.

Değişiklikler: `lib/rate-limit-store.ts`, `app/gizlilik-politikasi/page.tsx`.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
