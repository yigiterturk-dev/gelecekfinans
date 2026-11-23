# Mini piyasa widget'ında geçersiz değişim oranı

Piyasa API yanıtındaki değişim oranı null dışı fakat `NaN` veya sonsuz olduğunda widget artık bu değeri yüzde olarak yazmıyor; diğer fiyat verileri görünmeye devam ederken oran alanında nötr çizgi gösteriyor.

Canlı doğrulama: üretim build'i başarılı, servis `active`, ana sayfa HTTP 200.
Sonlu olmayan yüzdeler widget'ta `—` olarak gösteriliyor; fiyat alanları
bağımsız şekilde kalıyor.
