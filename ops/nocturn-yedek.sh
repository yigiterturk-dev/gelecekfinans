#!/usr/bin/env bash
# Nocturn — çok projeli PostgreSQL yedeği.
#
# NEDEN GENEL: ilk sürüm tek projeye özeldi. İkinci proje gelince aynı dosyayı
# kopyalamak, aynı hatayı iki yerde düzeltmek demekti — bugün tam olarak bu sınıf
# bir hata (aynı fonksiyonun kopyaları) ürünü bozmuştu. Yeni proje eklemek artık
# projeler/ altına tek bir .env dosyası koymaktır.
#
# Kullanım:
#   nocturn-yedek.sh            → projeler/*.env içindeki HER projeyi yedekler
#   nocturn-yedek.sh <proje>    → yalnız o projeyi
set -uo pipefail

KOK=/opt/nocturn-yedek
PROJELER="$KOK/projeler"
HEDEF_KOK=/var/backups/nocturn
LOG=/var/log/nocturn-yedek.log
SAKLA_GUN=30

log() { echo "$(date '+%F %T') $*" >> "$LOG"; }

haber() {
  local mesaj="$1"
  log "UYARI: $mesaj"
  [[ -r /root/jarvis/.env ]] || return 0
  local T C
  T="$(grep -m1 -E '^TELEGRAM_(BOT_)?TOKEN=' /root/jarvis/.env 2>/dev/null | cut -d= -f2- | tr -d '"'"'"' ')"
  C="$(grep -m1 -E '^TELEGRAM_(CHAT_ID|ADMIN_CHAT_ID|USER_ID)=' /root/jarvis/.env 2>/dev/null | cut -d= -f2- | tr -d '"'"'"' ')"
  [[ -n "$T" && -n "$C" ]] || return 0
  curl -s -m 15 -o /dev/null -X POST "https://api.telegram.org/bot${T}/sendMessage" \
    --data-urlencode "chat_id=${C}" --data-urlencode "text=🔴 Nocturn yedek: ${mesaj}" || true
}

yedekle() {
  local proje="$1" envf="$PROJELER/$proje.env"
  [[ -r "$envf" ]] || { haber "$proje: env okunamadi"; return 1; }

  # DİKKAT: source ETME. Bağlantı dizesinde `&channel_binding=...` var; tırnaksız
  # kaynak alınırsa kabuk `&`'i arka plan operatörü sayar ve değeri SESSİZCE keser.
  # (Bu tam olarak ilk kurulumda başımıza geldi: "DATABASE_URL boş".)
  local url
  url="$(grep -m1 '^DATABASE_URL=' "$envf" | cut -d= -f2- | tr -d "\"'")"
  [[ -n "$url" ]] || { haber "$proje: DATABASE_URL bos"; return 1; }

  local hedef="$HEDEF_KOK/$proje"
  mkdir -p "$hedef"; chmod 700 "$hedef"
  local dosya="$hedef/$proje-$(date +%Y%m%d-%H%M%S).dump"

  if ! pg_dump "$url" -Fc --no-owner --no-acl -f "$dosya" 2>>"$LOG"; then
    rm -f "$dosya"
    haber "$proje: pg_dump BASARISIZ (ayrinti: $LOG)"
    return 1
  fi
  chmod 600 "$dosya"

  # Yazıldı diye çalışır sayma: içindekiler listelenebiliyor mu?
  local tablo
  tablo="$(pg_restore -l "$dosya" 2>/dev/null | grep -c 'TABLE DATA')"
  if [[ "${tablo:-0}" -lt 1 ]]; then
    haber "$proje: yedek okunamiyor ya da bos (tablo=$tablo) — BOZUK sayildi"
    return 1
  fi

  log "OK $proje $(du -h "$dosya" | cut -f1) · $tablo tablo verisi"
  date +%s > "$hedef/.son-basarili"

  local kalan
  kalan="$(ls -1t "$hedef"/*.dump 2>/dev/null | wc -l)"
  if [[ "$kalan" -gt 3 ]]; then
    find "$hedef" -name '*.dump' -type f -mtime "+$SAKLA_GUN" -delete
  fi
  return 0
}

mkdir -p "$HEDEF_KOK" "$PROJELER"; chmod 700 "$HEDEF_KOK" "$PROJELER"

if [[ $# -ge 1 ]]; then
  yedekle "$1"; exit $?
fi

hata=0
shopt -s nullglob
for envf in "$PROJELER"/*.env; do
  proje="$(basename "$envf" .env)"
  yedekle "$proje" || hata=1
done
exit $hata
