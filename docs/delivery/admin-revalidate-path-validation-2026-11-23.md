# Yönetim önbellek yenileme istekleri

`/api/admin/revalidate` bozuk JSON/gövdeyi ve geçersiz yolları artık 400 ile reddediyor. Özel yol listesi 20 iç-yol ile sınırlı; protokol-relative adresler, sorgu/fragment, ters eğik çizgi ve kontrol karakterleri kabul edilmiyor. Yinelenen yollar tek kez yenileniyor.

Doğrulama: yönetim makale ekranının boş `paths` gövdesiyle uyumlu olduğu doğrulandı; `git diff --check` temiz. Test/build çalıştırılmadı.
