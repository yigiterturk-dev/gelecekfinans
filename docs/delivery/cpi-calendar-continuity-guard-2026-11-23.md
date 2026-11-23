# TÜFE oranlarında takvim sürekliliği kontrolü

`buildCpiRows` artık aylık, yıllık ve 12 aylık ortalama oranlarını üretmeden önce ilgili TÜFE gözlemlerinin ardışık takvim aylarına ait olduğunu doğruluyor. EVDS serisinde bir ay eksikse kaymış gözlem aralıklarından sessizce oran üretmek yerine etkilenen değer `null` kalıyor; veri akışı eksik ayı tamamladığında oranlar yeniden hesaplanıyor.

Değişiklik yalnızca `lib/tufe.ts` hesaplama mantığını etkiler. Test veya derleme çalıştırılmadı.
