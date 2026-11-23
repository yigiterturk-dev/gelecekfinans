# Faiz oranlarında doğrudan TCMB kaynak bağlantıları

Faiz sayfasında canlı oranların yanında yalnızca “Kaynak: TCMB” yazıyordu. Politika faizi artık TCMB'nin bir hafta repo tablosuna, gecelik borç alma/verme kartları da gecelik faiz tablosuna doğrudan bağlanıyor. Bağlantılar yeni sekmede açılıyor. Canlı veri alınamadığında tarihli statik fallback için mevcut TCMB karar duyurusu bağlantısı korunuyor.

Resmi tabloların kaynak kodundaki adresleriyle karşılaştırıldı; `git diff --check` temiz. Test/build veya tarayıcı kontrolü çalıştırılmadı.
