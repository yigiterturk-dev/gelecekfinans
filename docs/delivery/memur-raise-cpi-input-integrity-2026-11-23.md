# Memur zammı aracında TÜFE girdi doğruluğu

## Değişiklik

- TÜİK/EVDS verisi yoksa keyfî %10 enflasyon varsayımı kaldırıldı; oran boş kalıyor ve kullanıcıdan gerçekleşen değerini ya da senaryosunu girmesi isteniyor.
- Dönem seçimi değiştiğinde başka dönemin TÜFE oranı taşınmıyor.
- Kullanıcının dönem başına girdiği oran, dönemler arasında gidip gelirken korunuyor; otomatik TÜFE yalnızca verinin ait olduğu dönemde gösteriliyor.

## Doğrulama

- Kaynak verinin bulunmadığı durumda hesaplamanın sonuç üretmediği ve dönem eşleşmesi kuralları kod üzerinden gözden geçirildi.
- `git diff --check` çalıştırıldı. Test/build çalıştırılmadı.
