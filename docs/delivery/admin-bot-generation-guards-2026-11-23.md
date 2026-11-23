# Admin bot üretim API'si korumaları

Model çağrısı yapan üretim POST'u artık farklı kökenden gelen tarayıcı isteğini reddediyor, IP başına 30 dakikada 10 üretim isteğiyle sınırlı, katı JSON şeması uyguluyor ve her istekte tam olarak bir makaleye izin veriyor. Kelime hedefi 450–900 aralığında; kategori izinli site kategorileriyle sınırlı. AI otomasyonu kapalıysa model hattı çağrılmadan `503` dönüyor. Özel üretim yanıtları önbelleğe kapalı ve beklenmeyen sunucu hatası iç detaylarını açmıyor.
