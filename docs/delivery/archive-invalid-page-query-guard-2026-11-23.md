# Arşiv geçersiz sayfa sorgu koruması — 2026-11-23

Arşiv ve kategori sayfalarında geçersiz sayfa numaraları, 404 kararı verilmeden
önce makale satırı sorgusu çalıştırıyordu. `skip` parametresinin cache anahtarına
girdiği bu akış, var olmayan sayfa numaraları için gereksiz DB sorgusu ve
önbellek girdisi üretebilirdi. Arşiv artık önce toplam sayfa sayısını hesaplıyor
ve sınır dışı sayfayı liste sorgusundan önce 404 ile sonlandırıyor.

Arama sonuçlarında toplam ve sayfa verisi aynı arama sonucundan üretildiği için
o akışın davranışı değişmedi.

Doğrulama: kaynak incelemesi ve `git diff --check`. Test veya build çalıştırılmadı.
