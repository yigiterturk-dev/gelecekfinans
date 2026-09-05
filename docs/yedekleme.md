# Yedekleme ve geri yükleme

> Yedek "vardır" denmez, **geri yüklendiği gösterilir**. Bu dosya prosedürü ve
> en son yapılan provanın sonucunu tutar.

## Neden gerekli

Neon'un kendi zaman-içinde-geri-alma özelliği yanlış bir `DELETE` ya da bozuk bir
migration için yeterlidir. Ama **Neon hesabı kaybedilirse** (erişim kaybı, proje
silinmesi) o yedek de birlikte gider. Site canlı ve gerçek veri tutuyor —
makaleler, sayfa görüntülemeleri, arama performansı ve **abone e-postaları**.

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

## ⏳ Kalan

- **Üçüncü kopya yok**: yedek şu an yalnız VPS'te. Sunucu tamamen kaybedilirse
  yedek de gider — Hetzner Storage Box'a kopyalama eklenmeli.
- **Neon PITR saklama süresi doğrulanmadı** (ücretsiz planda tipik 24 saat).
