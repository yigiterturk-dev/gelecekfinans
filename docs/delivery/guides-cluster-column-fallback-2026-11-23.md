# Rehber listesinde `cluster` kolon yedeği — 2026-11-23

`getGuides()` artık `cluster` alanını seçen sorgu Prisma'nın eksik kolon hatasıyla başarısız olursa aynı rehber filtresini bu alan olmadan tekrar çalıştırıyor. Bu durumda dönen satırlara `cluster: null` atanıyor; `/rehber` içerikleri "Diğer Rehberler" bölümünde göstermeye devam eder. Başka DB hataları mevcut `DatabaseUnavailableError` yolunda kalıyor.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı. Bu koruma `cluster` kolonu henüz DB'ye eklenmemiş dağıtımları ele alır; eksik `track` kolonu gibi sorgunun temelini etkileyen şema farklarını gizlemez.
