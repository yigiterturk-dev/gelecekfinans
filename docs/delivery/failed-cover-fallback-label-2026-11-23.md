# Başarısız kapak görseli fallback etiketi — 2026-11-23

Bir makale görseli hata verdiğinde SafeImage kategori/alternatif görselini
gösteriyordu; ancak alt metin hâlâ asıl makale görselini anlatıyor ve ziyaretçi
alternatifin temsili olduğunu göremiyordu. Fallback görseli artık `Temsili
finans görseli` alt metni ve görünür “Temsili görsel” rozetiyle gösteriliyor.
Görselin kendisi de hata verirse mevcut markalı yüzey fallback'i korunuyor.

Doğrulama: kaynak incelemesi ve `git diff --check`. Test, build ve tarayıcı
kontrolü çalıştırılmadı.
