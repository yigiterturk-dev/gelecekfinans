# Fiyat uç noktasında kullanılabilir veri yoksa başarısız yanıt

`/api/fiyatlar`, TCMB, BIST, Bitcoin ve gram altın alanlarında sonlu ve pozitif
bir fiyat bulunmadığında artık `503` ve `Cache-Control: no-store` döndürüyor.
Kısmi fakat kullanılabilir veri `200` ile döner; widget eksik pazarları ayrıca
uyarı olarak gösterir. TCMB metin değerleri tam ondalık biçimde ayrıştırılır;
bozuk veya sıfır fiyatlar başarı yanıtına taşınmaz.

Canlı doğrulama: üretim build'i başarılı; `/api/fiyatlar` HTTP 200 döndürdü ve
USD, EUR, altın, Bitcoin ve BIST için pozitif fiyat alanları içerdi. TCMB XML
ayrıştırıcısının değerleri sayı türünde verdiği bulundu; ondalık yardımcı artık
sonlu sayıları da kabul ediyor. Tüm kaynakların başarısız olduğu durum canlıda
zorlanmadı; 503/no-store davranışı kaynak kodunda ve build çıktısında doğrulandı.
