# TÜFE yarıyıl hesaplamasında ay sürekliliği

## Değişiklik

`halfYearCumulative` artık son yayımlanan aydan ilgili Haziran/Aralık baz ayına kadar her ayın seride bulunduğunu doğruluyor. Arada ay eksikse yarıyıl oranı üretmiyor. Boş seri, geçersiz ay ve pozitif olmayan endeks değerleri de `null` ile sonuçlanıyor. EVDS yanıtı alınırken endeks metni sıkı ondalık olarak ayrıştırılıyor, tarih alanı doğrulanıyor ve aynı ay için birden fazla geçerli kayıt varsa seri reddediliyor. Aylık `Tarih` değeri EVDS'nin kullandığı `YYYY-M` biçiminin yanı sıra `YYYY-MM` biçiminde de kabul ediliyor. Aylık, yıllık, 12 aylık ortalama ve yarıyıl değişimleri de sonlu değilse yayımlanmıyor.

## Gerekçe

Memur/emekli zam penceresi, kaynak serideki son ve baz endeks değerlerini bölerek hesaplanıyor. Aradaki bir ay eksik olsa bile eski davranış kısmi dönem oranını tam yarıyıl oranı gibi etiketleyebilirdi.

## Doğrulama

- Kontrol, mevcut `buildCpiRows` ay sürekliliği guard'ının yarıyıl hesabında bulunmadığını gösterdi.
- Kaynak serisi ayrıştırılırken ay aralığı, tarih biçimi ve yinelenen ay kontrolleri eklendi.
- EVDS'nin aylık tarih alanının tek haneli ayı sıfırla doldurmadan da döndürebildiği kontrol edildi; ayrıştırıcı her iki gösterimi kabul ediyor.
- Yüzde değişim hesapları ortak bir sonlu/pozitif temel değer kontrolünden geçiriliyor; ara toplam veya bölme taşarsa oran `null` oluyor.
- `git diff --check` temiz.
- Test ve build çalıştırılmadı.
