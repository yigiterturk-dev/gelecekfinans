# Makale düzenlemesinde yayın tarihini koru

Yönetim formu mevcut durumu da PATCH ile gönderdiği için yayımdaki bir makaleyi her kaydetmek `publishedAt` tarihini ileri alıyordu. API artık tarihi yalnızca makale başka bir durumdan `PUBLISHED` durumuna geçerken atıyor. Aynı kayıt sorgusu, var olmayan kimliklerde kontrollü `404` vermek ve yayın kontrolünde görseli yeniden sorgulamamak için kullanılıyor. Makale yönetimi yanıtlarına `private, no-store` eklendi; detay okuma, güncelleme ve silme işlemleri IP bazlı hız sınırına alındı.
