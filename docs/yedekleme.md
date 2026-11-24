# Yedekleme ve geri yükleme

> Yedek "vardır" denmez, **geri yüklendiği gösterilir**. Bu dosya prosedürü ve
> en son yapılan provanın sonucunu tutar.

## Neden gerekli

Canlı veritabanı yönetilen Neon hizmetinde değil: üretim `DATABASE_URL` host'u
`127.0.0.1:5434`, sunucu konteyneri `gf-db` (PostgreSQL 17). Bu nedenle Neon
PITR bu veritabanına uygulanmıyor. Site ile günlük DB kopyaları aynı VPS'te;
sunucunun/diskin tamamen kaybında ikisi de kaybolabilir. Kalıcı dış yedek bu
arıza alanından bağımsız tek kopyadır. Veritabanı makaleler, sayfa görüntüleme,
arama performansı ve abone kayıtlarını içerir.

## Kurulu (Hetzner 89.167.52.36, 2026-09-05)

Yedek **çok projeli** ortak bir sistemle alınır; bu depodaki `ops/` klasörü
sunucuya kurulan dosyaların birebir kopyasıdır.

| Yol | İş |
|---|---|
| `/opt/nocturn-yedek/nocturn-yedek.sh` | Günlük yedek, 03:15 |
| `/opt/nocturn-yedek/nocturn-yedek-bekci.sh` | Bekçi, 09:30 |
| `/opt/nocturn-yedek/projeler/gelecekfinans.env` | `DATABASE_URL`, mod 600 |
| `/var/backups/nocturn/gelecekfinans/` | Yedekler, mod 700 · 30 gün rotasyon |
| `/var/log/nocturn-yedek.log` | Günlük |
| `/etc/cron.d/nocturn-yedek` | Zamanlama |

**Yeni proje eklemek** = `projeler/` altına tek bir `<proje>.env` dosyası koymak.

### ⚠️ İki tuzak (ikisi de gerçekte yaşandı)

1. **İstemci sürümü sunucudan eski olamaz.** Başka bir projede yerel `pg_dump` 16,
   sunucu 18'di; komut `server version mismatch` verip **sıfır bayt** üretiyordu —
   "yedek komutumuz var" sanılan durumda gerçekte hiç yedek yoktu.
2. **`DATABASE_URL` `source` EDİLEMEZ.** İçinde `&channel_binding=...` var; env
   dosyası tırnaksızsa kabuk `&`'i arka plan operatörü sayar ve değeri **sessizce
   keser**. Script `source` etmez, `grep | cut | tr` ile okur.

### Bekçi neden ayrı

Yedek işi hiç **çalışmazsa** (cron bozuk, disk dolu, sunucu kapalı) kendisi
uyaramaz — sessiz başarısızlık en tehlikeli hâldir. Bekçi her projenin son
**başarılı** yedeğinin yaşına bakar; 26 saati geçerse loga yazar ve Telegram'a
haber verir. **Test edildi:** damga 30 saat geriye alınınca projeyi adıyla
bildirdi, tazeyken sustu.

## Geri yükleme provası (3 ayda bir)

Sunucuda `initdb` root olarak çalışmaz; prova Docker ile yapılır:

```bash
DUMP=$(ls -1t /var/backups/nocturn/gelecekfinans/*.dump | head -1)
docker run -d --rm --name gf-prova -e POSTGRES_PASSWORD=prova -e POSTGRES_DB=prova postgres:17-alpine
# Init sırasında entrypoint GEÇİCİ bir sunucu çalıştırır ve `pg_isready` o an da
# "hazır" der. Gerçek hazırlık ölçütü dış bağlantıyla SELECT 1'dir:
for i in $(seq 1 60); do docker exec gf-prova psql -U postgres -d prova -Atc "SELECT 1" >/dev/null 2>&1 && break; sleep 1; done
docker cp "$DUMP" gf-prova:/tmp/y.dump
docker exec gf-prova pg_restore -U postgres -d prova --no-owner --no-acl /tmp/y.dump
docker exec gf-prova psql -U postgres -d prova -Atc "SELECT count(*) FROM pg_stat_user_tables"
docker rm -f gf-prova
```

### Son prova — 2026-09-05

| Ölçüt | Sonuç |
|---|---|
| `pg_restore` hata satırı | **0** |
| Tablo | 14 |
| Veri | AutomationEvent 1428 · PageView 1146 · SearchPerformance 524 · BotRun 204 — canlıyla birebir |

### Son prova — 2026-11-23

22 Kasım tarihli en yeni dump, ağ bağlantısı olmayan geçici `postgres:17-alpine`
container'ına `pg_restore --exit-on-error` ile geri yüklendi; canlı veritabanına
bağlanılmadı.

| Ölçüt | Sonuç |
|---|---|
| Dump | 22 Kasım 2026, 03:15 · 1.305.632 bayt · `pg_restore --list` başarılı |
| `pg_restore` | **Hata yok** |
| Public tablo | 14 |
| Article | 214 |
| AutomationEvent | 5431 |

### Yayın öncesi prova — 2026-11-23

Yayın öncesinde yeni custom-format dump alındı ve ağsız geçici
`postgres:17-alpine` container'ına `pg_restore --exit-on-error` ile geri
yüklendi. Canlı veritabanına yazılmadı.

| Ölçüt | Sonuç |
|---|---|
| Dump | `gelecekfinans-20261123-000918.dump` · 1.323.229 bayt · 14 TABLE DATA girdisi |
| `pg_restore` | **Hata yok** |
| Public tablo | 14 |
| Article | 214 |
| AutomationEvent | 5526 |

### Günlük yedek kontrolü — 2026-11-23

Canlı `gf-yedek.timer` işi bugün 03:20 CET'te başarıyla tamamlandı; servis
`Result=success`, `ExecMainStatus=0`, `NRestarts=0`. Nocturn yedek günlüğü
03:15:01'de GelecekFinans için 1,3 MB ve 14 tablo-verisi girdisi kaydediyor.
En yeni günlük dosya `/var/backups/nocturn/gelecekfinans/gelecekfinans-20261123-031501.dump`:
1.323.298 bayt, mod 600; `pg_restore -l` 14 `TABLE DATA` girdisi gösterdi.
Günlük başarı damgası güncel ve sonraki timer 24 Kasım 03:20 CET. Bu kontrolde
geri yükleme provası tekrarlanmadı. O tarihte yedekleme yolu `/dev/vda4` kök
dosya sistemindeydi ve Mac kopyası henüz doğrulanmamıştı.

Ek olarak `gf-yedek.timer` her gün 03:20'de `/opt/gelecekfinans-db/yedek.sh`
çalıştırıyor; 23 Kasım koşumu `Result=success`, çıkış kodu 0 ve sıfır
restart'la tamamlandı. Bu ikinci arşiv de aynı `/dev/vda4` diskine yazılıyor,
dolayısıyla bağımsız bir felaket kurtarma kopyası oluşturmuyor. Sunucuda
`rclone`/uzak depolama yapılandırması, ağ yedeği mount'u veya offsite aktarım
betiği bulunmadı.

İzin denetiminde ikinci arşivin klasörü `755`, dump dosyası `644` bulundu.
23 Kasım'da klasör `700`, mevcut `gf-*.dump` dosyaları `600` yapıldı ve
`yedek.sh` içine `umask 077` eklendi; sonraki dump'lar da özel izinlerle oluşur.

### Arşiv bütünlüğü ve atomik yazım — 2026-11-24

Kontrolde `gf-20261121.dump` sıfır bayt bulundu; aynı günün `gf-yedek`
koşumunun systemd çıkış kodu sıfır görünse de dosya geçerli bir yedek değildi.
Bu nedenle `/opt/gelecekfinans-db/yedek.sh`, dump'ı önce aynı klasörde geçici
dosyaya yazacak, boş olmayan çıktıyı `pg_restore --list` ile doğrulayacak ve
ancak sonra günlük hedefe atomik olarak taşıyacak şekilde düzeltildi. Başarısız
çıktı artık önceki geçerli günlük dump'ın üzerine yazılamaz. Güncel veritabanı
üzerinden ayrıca alınan `/opt/gelecekfinans-db/yedek/gf-20261124.dump` 1.284.691
bayt; `pg_restore --list` doğrulamasından geçti ve dosya modu `600`. Aynı
betik elle çalıştırılarak günlük hedef yeniden üretildi ve doğrulandı. Dump,
ağsız geçici PostgreSQL 17 container'ına `pg_restore --exit-on-error` ile
başarıyla geri yüklendi; 14 public tablo ve 214 Article kaydı bulundu. Canlı
veritabanına restore yapılmadı.

### Zamanlanmış yedek sonrası doğrulama — 2026-11-24

Yeni betiğin ilk zamanlanmış koşumu `gf-yedek.timer` ile 03:20 CET'te
çalıştı; `Result=success`, `ExecMainStatus=0`. Oluşan günlük arşiv 1.284.691
bayt, modu `600`; `pg_restore --list` başarılı oldu. Bu zamanlanmış arşivin
kendisi de ağsız geçici PostgreSQL 17 container'ına `pg_restore
--exit-on-error` ile yüklendi; 14 public tablo ve 214 makale doğrulandı. Böylece
yalnızca elle çalıştırma değil, timer→script→arşiv→geri yükleme yolu da
doğrulandı. Canlı veritabanına restore yapılmadı.

### Mac kopyası — 2026-11-24

Mac'teki mevcut `com.nocturn.netcup-yedek-cek` LaunchAgent her gün 09:00'da
`netcup:/var/backups/nocturn/` içeriğini `~/Yedekler/netcup-nocturn/` altına
SSH ile eşitler; 60 günden eski `.dump` dosyalarını temizler ve yüklenince de
çalışır. 24 Kasım kontrolünde son başarılı koşum 23 Kasım 09:00, son çıkış kodu
0 ve toplam koşum sayısı 8'di.

24 Kasım GelecekFinans Nocturn arşivi
`gelecekfinans-20261124-031502.dump` Mac'teki eşitleme hedefine kopyalandı.
Boyutu 1.284.716 bayt; dosya modu `600`; sunucu ve Mac SHA-256 değerleri eşit;
yerel `pg_restore --list` başarılı. Mac'in FileVault'u açık. Ayrıca doğrudan
güncel `/opt/gelecekfinans-db/yedek/gf-20261124.dump` arşivinin doğrulanmış
1.279.554 baytlık, `600` izinli bir kopyası `~/Backups/gelecekfinans/` içine
alındı. İkinci yerel kopya LaunchAgent'in eşitlediği klasörde değildir.

## ⏳ Kalan

- Mac'teki doğrulanmış kopya VPS dışıdır; fakat ayrı coğrafi konumda veya bulut
  depolamada olduğu doğrulanmadı. Otomatik Mac eşitlemesi, kullanıcı oturumu ve
  Mac'in uyanık olması koşuluna bağlıdır. Bu nedenle coğrafi olarak bağımsız
  offsite/immutable kopya hâlâ yapılandırılmamıştır.
