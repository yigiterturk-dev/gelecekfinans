# Arama klavye seçimi sınırı — 2026-11-23

Arama sonuçları API'den yüklenirken aşağı ok tuşuna basılması seçili sonucu
`-1` yapabiliyordu. Sonuçlar geldikten sonra Enter ile ilk sonucu açmak için
ek bir tuş hareketi gerekiyordu. Seçim indeksi artık sonuç yokken `0`, sonuç
varken mevcut sonuç aralığında kalıyor.

Doğrulama: kaynak incelemesi ve `git diff --check`. Test, build ve tarayıcı
kontrolü çalıştırılmadı.
