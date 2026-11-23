# Yönetim ayarlarındaki sayı alanı düzenlemesi

Otonom yayın ayarlarındaki sayı alanları boşaltıldığında `Number("")` değeri `0` olarak kaydedilebiliyordu; bu da alanın sınırlarıyla çelişen geçici form durumu yaratıyordu. Alan artık düzenleme metnini ayrı tutuyor, geçerli sayıları kayda yansıtıyor ve odak kaybında değeri izin verilen aralık ile adım değerine göre normalize ediyor. Boş veya geçersiz taslak mevcut kayıtlı değere döner.

Kontrol: ilgili API şeması ve kaydetme sınırlarıyla (`dailyArticleCount` 1–2, `targetWords` 450–900) karşılaştırıldı; `git diff --check` temiz. Test/build çalıştırılmadı.
