# Statik faiz referansına TCMB kaynak bağlantısı — 2026-11-23

Canlı faiz uçları yanıt vermediğinde `/faiz`, TCMB oranlarını statik yedek
değerlerden gösteriyor. Önceki metin yalnızca “Ekim 2026 dönemi” diyordu ve
doğrudan dayanak karar bağlantısı sunmuyordu. Yedek veri artık 22 Ekim 2026
tarihli kararı açıkça belirtiyor ve ilgili TCMB faiz duyurusuna bağlanıyor.
Otomatik güncellenmediği uyarısı korunuyor.

Ek kontrol: EVDS politika faizi canlı gelirken TCMB'nin üçlü faiz tablosu
başarısız olursa gecelik bantlar hâlâ statik kalır. Sayfa artık canlı politika
faiziyle statik gecelik bantları ayırıyor; politika kartı da canlı oranı
kullanıyor. Üçlü tablo yanıt verirse tüm kartlar TCMB değerlerine geçiyor.

Kaynak ve değerler: [TCMB, Faiz Oranlarına İlişkin Basın Duyurusu (2026-45)](https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb%2Btr/main%2Bmenu/duyurular/basin/2026/duy2026-45)

Doğrulama: resmi TCMB duyurusu ve kaynak incelemesi; `git diff --check`.
Test, build ve tarayıcı kontrolü çalıştırılmadı.
