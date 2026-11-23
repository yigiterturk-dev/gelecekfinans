# Admin makale listesinin yükleme güvenilirliği

Liste isteği artık filtre veya sayfa değişince önceki fetch'i iptal ediyor; eski yanıtlar güncel listeyi ezemiyor. HTTP/JSON hataları ve yanıt şekli bozukluğu görünür hata mesajı veriyor. Yanıtın makale satırları ve toplam sayısı arayüze alınmadan doğrulanıyor.
