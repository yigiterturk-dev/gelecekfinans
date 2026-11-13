#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
  news|guide|gsc|image|index|newsletter) job="$1" ;;
  /api/bot/cron) job=news ;;
  /api/bot/guide-cron) job=guide ;;
  /api/bot/gsc-cron) job=gsc ;;
  /api/bot/image-repair) job=image ;;
  /api/bot/index-ping) job=index ;;
  /api/newsletter/cron) job=newsletter ;;
  *) echo 'Unknown GelecekFinans job' >&2; exit 1 ;;
esac
# Bir koşum uzadığında ikincisini başlatma; üretimi otomatik tekrar denemek
# yinelenen içerik ve ikinci model ücreti doğurabilir.
exec /usr/bin/flock -n -E 75 "/run/lock/gelecekfinans-${job}.lock" \
  /usr/bin/node --env-file=/opt/gelecekfinans/.env.production \
  /opt/gelecekfinans/ops/gf-cron.cjs "$job"
