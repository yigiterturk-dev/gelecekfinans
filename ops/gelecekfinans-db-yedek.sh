#!/usr/bin/env bash
set -euo pipefail
umask 077

BACKUP_DIR=/opt/gelecekfinans-db/yedek
TODAY=$(date +%Y%m%d)
TARGET="$BACKUP_DIR/gf-$TODAY.dump"
mkdir -p "$BACKUP_DIR"
TMP=$(mktemp "$BACKUP_DIR/.gf-$TODAY.dump.XXXXXX")
trap 'rm -f "$TMP"' EXIT

docker exec gf-db pg_dump -U gf -Fc --no-owner --no-acl gelecekfinans > "$TMP"
test -s "$TMP"
pg_restore --list "$TMP" >/dev/null
chmod 600 "$TMP"
mv -f "$TMP" "$TARGET"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'gf-*.dump' -mtime +14 -delete
printf 'Verified PostgreSQL backup: %s (%s bytes)\n' "$TARGET" "$(stat -c %s "$TARGET")"
