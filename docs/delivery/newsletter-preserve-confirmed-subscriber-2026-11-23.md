# Bülten formu mevcut onayı koruyor

Bülten formu, e-posta gönderimi başarısız olduğunda mevcut aktif ve onaylı bir aboneyi artık `confirmed=false` durumuna düşürmüyor. Bu kayıtların tercih/kaynak bilgisi güncellenirken onay alanlarına dokunulmuyor. Yeni, pasif veya henüz doğrulanmamış adresler ise mevcut çift-onay akışında onaysız kalıyor; onay maili gönderilemezse bülten gönderim listesine giremiyor.
