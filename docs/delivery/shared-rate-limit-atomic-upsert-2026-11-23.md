# Paylaşımlı hız sınırı eşzamanlı istek düzeltmesi

Veritabanı sayaç akışı tek atomik PostgreSQL `INSERT ... ON CONFLICT DO UPDATE` işlemine taşındı. Önceki `findUnique` + `upsert(hits=1)` yolu, aynı IP için pencerenin ilk eşzamanlı isteklerinde sayacı tekrar tekrar 1'e yazabiliyor ve sınırı aşan bir istek kümesine izin verebiliyordu. Yeni işlem ilk oluşturma, süresi dolmuş pencereyi sıfırlama ve etkin pencerede artırmayı aynı satır kilidi altında yapıyor.

Sayaç, pencere dolana kadar `limit + 1` değerinde tutuluyor; reddedilen istekler sayacı sınırsız büyütmüyor. Veritabanı erişilemezse mevcut süreç içi yedek davranışı korunuyor.
