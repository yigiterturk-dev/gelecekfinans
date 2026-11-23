# Altın TL günlük değişiminde kur etkisi

Altın fiyatlarının TL cinsinden günlük değişim hesabı artık önceki ons fiyatını önceki USD/TRY referans kuruyla çarpıyor. Böylece yüzde değişim hem altının dolar fiyatındaki hem de kurdaki hareketi içeriyor.

`/api/fiyatlar` altın değerini ortak piyasa modelinden (`getAllGold`) alıyor; bu da altın sayfası ve widget arasındaki fiyat/yüzde hesabını hizalıyor. Widget'taki dolar ve euro fiyatları TCMB satış kuru olarak kalıyor. Farklı bir sağlayıcının geçmiş serisi bu resmi fiyatla eşleştirilmediği için dolar/euro satırlarında yanıltıcı yüzde ve sparkline kaldırıldı. Bu değişiklik iki ek Yahoo kur geçmişi isteğini de ortadan kaldırıyor.
