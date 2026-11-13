# GelecekFinans availability — 1 November 2026

Production uses PostgreSQL at 127.0.0.1:5434 on Netcup. Neon is no longer needed. The obsolete one-off Neon recovery cron was moved to the private rollback directory.

## Released

- `lib/articles.ts`: database failures propagate instead of caching an empty homepage or guide archive. ISR can retain its last successful page; a cold request can still return a server error during a database outage. An optional page-view counter failure no longer hides otherwise available articles.
- `ops/gf-cron.cjs` and `ops/gf-cron.sh`: locked, bounded cron calls, HTTP and JSON outcome classification, persistent state per job under `/var/lib/gelecekfinans/cron/`, no raw response or credential logging. Missing AI configuration blocks news/guide calls before they can consume keyword attempts.
- Five systemd timers replace the publishing entries in `/etc/cron.d/gelecekfinans-cron`. `OnCalendar` specifies UTC explicitly; Debian cron was using the server's Berlin timezone despite the previous `CRON_TZ=UTC` declaration. The existing newsletter schedule remains in cron.
- News attempts: 08:00, 13:00, 18:30 Istanbul. Guide attempts: 11:00, 15:00, 23:00 Istanbul. Publication still depends on evidence, quality checks, budget and provider availability. Catch-up invocations are disabled; each job has a non-overlap lock and no automatic generation retries.
- OpenAI is selected (`gpt-5` writer, `gpt-5-mini` verifier). User explicitly deferred adding the key. The available old key returned 401 and was never activated. Both production job preflights returned `MISSING_AI_KEY` without HTTP calls. A valid key must be added securely to `/opt/gelecekfinans/.env.production`, then `gelecekfinans.service` restarted. Do not claim content generation is operational yet.
- Search Console API credentials are still absent; search-performance reporting remains unavailable.

## Backup and verification

A fresh custom-format dump was restored into an isolated PostgreSQL database and verified: 108 PUBLISHED, 1 DRAFT, 23 ARCHIVED. The temporary verification database was then removed. No production rows were changed.

Server copy: `/var/backups/nocturn/gelecekfinans/gelecekfinans-20261101-before-availability.dump`.
Computer copy: `/Users/yigiterturk/Backups/gelecekfinans/gelecekfinans-20261101-before-availability.dump` (600 permissions).
Existing daily backup configuration was checked and points to the new local PostgreSQL database.

257 tests passed before the final missing-key preflight addition; all eight availability tests including that new case then passed. Scoped ESLint, TypeScript and the isolated production build passed. Before the change, the new article tests reproduced three failures. Preview verification covered homepage, guides, a published article (200), unknown URL (404), and unauthorized cron (401).

Only the availability change was built from the production source in an isolated directory, preserving unrelated local design/keyword work. The source baseline was checked before activation. Production release BUILD_ID: `U95k-T027D7aCyPEMRQeQ`. The app remains active.

Rollback artifacts are in `/root/gf-availability-release-backup-20261101`, `/root/gf-availability-backup-20261101`, and `/opt/gelecekfinans/.next.before-availability-20261101`. Previous source, environment, cron configuration and build are retained privately. Staging preview service is stopped.

Inspection commands:

```sh
systemctl list-timers --all 'gelecekfinans-*'
journalctl -u gelecekfinans-job@news.service -n 30 --no-pager
cat /var/lib/gelecekfinans/cron/news.json
```

No new articles, newsletter deliveries, external notifications, fabricated author profiles, or Search Console metrics were generated during this release.
