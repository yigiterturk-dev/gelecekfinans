# Finansal araçlarda sıkı ondalık girdi ayrıştırma

## Değişiklik

Hesaplayıcılarda ortak `parseDecimalInput` kullanılıyor. Nokta veya virgülle ondalık değer kabul ediliyor; boş, kısmi ya da ek metin içeren girişler (`12abc` gibi) sayıya çevrilmiyor. Sonuç sonlu sayı değilse de geçersiz sayılıyor.

Kullanım kapsamı: bileşik getiri, mevduat, kredi, enflasyon, temettü, hisse K/Z, kira artışı, memur/emekli zammı, altın miktarı, halka arz talep ve döviz çevirici. TCMB kur XML'indeki sayısal alanlar ve EVDS TÜFE endeks değeri de aynı katı ayrıştırıcıyla doğrulanıyor. Anthropic faturalama tutarları da `Number` ile tam değer olarak ayrıştırılıyor.

## Gerekçe

`parseFloat` sayısal önekleri kabul ettiği için bazı biçim bozuk girdileri geçerli tutar gibi hesaplayabiliyordu. Ortak ayrıştırıcı girdi doğrulamasını tutarlı hale getiriyor.

## Doğrulama

- Değiştirilen hesaplayıcılarda `parseFloat` kullanımı kalmadığı `rg` ile kontrol edildi.
- TCMB/EVDS kaynak değerlerinde sayısal olmayan ek metinlerin kısmen kabul edilmemesi sağlandı.
- Anthropic faturalama API tutarlarında `parseFloat` ile kısmi değer kabul edilmesi kaldırıldı.
- `git diff --check` temiz.
- Test ve build çalıştırılmadı.
