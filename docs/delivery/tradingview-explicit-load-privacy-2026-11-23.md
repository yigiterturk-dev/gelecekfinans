# TradingView grafiğini kullanıcı isteğiyle yükleme

Borsa ve hisse sayfalarındaki TradingView betiği, grafik bileşeni açıldığı anda üçüncü taraf sunucusuna bağlanıyordu. Grafik artık varsayılan olarak yer tutucu gösteriyor; sağlayıcı bağlantısı yalnızca kullanıcıdaki “TradingView grafiğini yükle” düğmesine bastıktan sonra başlıyor. İzin yalnızca o bileşen örneği için geçerli; “Grafiği kaldır” ile istek sonlandırılabiliyor. TradingView'e doğrudan bağlantı da görünür durumda.

Çerez ve gizlilik metinleri bu akışla eşitlendi. KVKK'nın Çerez Uygulamaları Hakkında Rehberi, zorunlu olmayan çerezlerin varsayılan pasif olmasını, rızanın aktif eylemle ve belirli amaç için alınmasını, kullanılan çerezlerin ve üçüncü taraflarının açıklanmasını öneriyor: https://www.kvkk.gov.tr/SharedFolderServer/CMSFiles/fb193dbb-b159-4221-8a7b-3addc083d33f.pdf. Bu kod değişikliği hukuki uygunluk değerlendirmesi değildir; TradingView'in gerçek çerez ve ağ davranışı tarayıcıda ayrıca ölçülmedi.

`git diff --check` doğrulandı. Test, build ve tarayıcı çalıştırılmadı.
