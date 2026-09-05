#!/usr/bin/env bash
# Bekçi — HER projenin son BAŞARILI yedeğinin yaşına bakar.
#
# Neden ayrı: yedek işi hiç ÇALIŞMAZSA (cron bozuk, disk dolu, sunucu kapalı)
# kendisi uyaramaz. Sessiz başarısızlık en tehlikeli hâldir.
set -uo pipefail
KOK=/opt/nocturn-yedek/projeler
HEDEF_KOK=/var/backups/nocturn
LOG=/var/log/nocturn-yedek.log
SINIR=$((26*3600))

gecikenler=()
shopt -s nullglob
for envf in "$KOK"/*.env; do
  proje="$(basename "$envf" .env)"
  son="$(cat "$HEDEF_KOK/$proje/.son-basarili" 2>/dev/null || echo 0)"
  yas=$(( $(date +%s) - son ))
  [[ "$yas" -le "$SINIR" ]] && continue
  gecikenler+=("$proje ($(( yas/3600 ))s)")
done

[[ ${#gecikenler[@]} -eq 0 ]] && exit 0
MSJ="yedek alinmiyor: ${gecikenler[*]}"
echo "$(date '+%F %T') UYARI: $MSJ" >> "$LOG"
[[ -r /root/jarvis/.env ]] || exit 0
T="$(grep -m1 -E '^TELEGRAM_(BOT_)?TOKEN=' /root/jarvis/.env 2>/dev/null | cut -d= -f2- | tr -d '"'"'"' ')"
C="$(grep -m1 -E '^TELEGRAM_(CHAT_ID|ADMIN_CHAT_ID|USER_ID)=' /root/jarvis/.env 2>/dev/null | cut -d= -f2- | tr -d '"'"'"' ')"
[[ -n "$T" && -n "$C" ]] || exit 0
curl -s -m 15 -o /dev/null -X POST "https://api.telegram.org/bot${T}/sendMessage" \
  --data-urlencode "chat_id=${C}" --data-urlencode "text=🔴 Nocturn: ${MSJ}" || true
