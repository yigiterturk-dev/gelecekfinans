# Production operations

Current production facts are in [the live release record](delivery/current-live-release-2026-11-23.md),
[the AI cost audit](delivery/ai-cost-audit-2026-11-23.md), and
[the backup guide](yedekleme.md). This runbook records the routine checks and
recovery path observed on the Netcup host; it does not authorize enabling AI
generation or changing provider credentials.

## Service health

The public site is served by `gelecekfinans.service` behind the `hub-caddy`
Docker container. Caddy is not a host `caddy.service`. Check the app, Docker
reverse proxy, recent app logs, and core public routes:

```bash
ssh netcup 'systemctl is-active gelecekfinans.service docker'
ssh netcup 'docker inspect --format "{{.State.Status}}" hub-caddy'
ssh netcup 'systemctl show gelecekfinans.service -p WorkingDirectory -p NRestarts -p ExecMainStatus'
ssh netcup 'journalctl -u gelecekfinans.service -n 100 --no-pager'
curl -fsS -o /dev/null -w '%{http_code} %{time_starttransfer}\n' https://gelecekfinans.com/
curl -fsS -o /dev/null -w '%{http_code} %{time_starttransfer}\n' https://gelecekfinans.com/rehber
curl -fsS -o /dev/null -w '%{http_code} %{time_starttransfer}\n' https://gelecekfinans.com/news-sitemap.xml
```

An unauthenticated `401` from `/api/admin/ai-provider` is the expected access
control result. Do not print or paste `/opt/gelecekfinans/.env.production`;
check only specifically needed non-secret flags.

## AI spend state

As of 24 November 2026, `AI_AUTOMATION_ENABLED=false`,
`AI_DAILY_SPEND_LIMIT_USD=0`, and the news and guide writer timers are inactive.
The six-hour `gf-nobet.timer` exits before model calls when automation is off.
Do not run a writer cron manually while this state is in place. OpenAI account
balance is not visible to this service. Production keeps the legacy
`ARTICLE_AI_PROVIDER=deepseek` and `DEEPSEEK_*` environment names, but the
configured Google endpoint plus `gemini-2.5-flash` model now resolve as provider
`gemini`. This preserves the existing Google key and URL without confusing its
usage or quota errors with DeepSeek or OpenAI. New deployments can select
`ARTICLE_AI_PROVIDER=gemini` with `GEMINI_*` settings. Automation is disabled,
so neither route makes model calls.

## Database backup and restore check

The daily `gf-yedek.timer` invokes `/opt/gelecekfinans-db/yedek.sh` at 03:20
CET. That script writes to a private temporary file, rejects an empty dump,
checks it with `pg_restore --list`, then atomically moves it into
`/opt/gelecekfinans-db/yedek/`. A successful `systemd` result alone is not
proof of a valid archive; verify the file itself:

```bash
ssh netcup '/opt/gelecekfinans-db/yedek.sh'
ssh netcup 'pg_restore --list /opt/gelecekfinans-db/yedek/gf-$(date +%Y%m%d).dump >/dev/null'
```

For a restore rehearsal, use a disposable PostgreSQL 17 container with
`--network none`; never restore a rehearsal into the live `gf-db` container.
See [the backup guide](yedekleme.md) for the complete tested command sequence.
The latest verified rehearsal (24 November 2026) restored 14 public tables and
214 articles. A verified 24 November database dump also exists on the user's
Mac in `~/Yedekler/netcup-nocturn/gelecekfinans/`; its SHA-256 matches the VPS
archive, `pg_restore --list` passes, and FileVault is on. The existing
`com.nocturn.netcup-yedek-cek` LaunchAgent syncs `/var/backups/nocturn/` to that
Mac daily at 09:00 and keeps 60 days. This is an off-VPS copy, but its separate
geographic location is unknown and there is no cloud/immutable target.

## Deployment and rollback

Production runs Next.js from the exact build directory stored in the
`WorkingDirectory` and `ExecStart` values of
`/etc/systemd/system/gelecekfinans.service.d/20-release.conf`. Keep source and
`.next` in that same directory. Turbopack rejects external symlinks for
`node_modules` and files inside `public/gorseller` during a build; use real
files while building, then restore `public/gorseller` as a symlink to
`/opt/gelecekfinans/public/gorseller` before activation so uploaded images
persist across releases.

Before changing the service override, take and verify a fresh database dump,
save the current override and build directory, then switch the override,
reload systemd, and restart the service. Afterward confirm the service is
active, `NRestarts=0`, the homepage and changed route return `200`, and the
unauthenticated provider endpoint returns `401`. Retain the previous build and
override until those checks pass.

The current build is `5GSD6fGWHLFg7YXjbFQze` in
`/opt/gf-stage-article-date-cache-20261124a`. Its rollback snapshot is
`/root/gf-release-before-category-date-cache-20261124/20-release.conf`; the
previous build is `/opt/gf-stage-repeat-guard-20261124a`. To restore the
previous override:

```bash
ssh netcup 'install -m 644 /root/gf-release-before-category-date-cache-20261124/20-release.conf /etc/systemd/system/gelecekfinans.service.d/20-release.conf && systemctl daemon-reload && systemctl restart gelecekfinans.service'
```

Then repeat the health checks above. Rollback changes the application version;
it does not reverse database writes, which require their own reviewed restore
plan.
