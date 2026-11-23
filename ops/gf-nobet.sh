#!/bin/bash
# GelecekFinans bot nöbeti: yalnızca otomasyon açıkken API erişimini ve yayın akışını denetler.
set -uo pipefail
cd /opt/gelecekfinans
set -a
. ./.env.production
set +a

if [ "${AI_AUTOMATION_ENABLED:-false}" != "true" ]; then
  echo "AI otomasyonu kapalı; ücretli LLM ping'i ve yayın alarmı atlandı."
  exit 0
fi

SORUN=""
# Nöbet kontrolü OpenAI/LLM API'sine bağlanmaz; kredi tüketen ping yapılmaz.

SQL='select count(*) from "Article" where "publishedAt" > now() - interval '\''30 hours'\'';'
SON=$(printf '%s\n' "$SQL" | docker exec -i gf-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA' 2>&1)
[ "$SON" -gt 0 ] 2>/dev/null || SORUN+="Son 30 saatte yayınlanan yazı: ${SON} (bot sessizce duruyor olabilir)"$'\n'

if [ -n "$SORUN" ]; then
  printf "🔴 gelecekfinans bot\n%s" "$SORUN" | BILDIR_KAYNAK=gf-nobet /usr/local/bin/bildir.sh
else
  echo "temiz (son 30 sa yayın: $SON)"
fi
