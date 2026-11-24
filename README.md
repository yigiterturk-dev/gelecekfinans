# GelecekFinans

[![CI](https://github.com/yigiterturk-dev/gelecekfinans/actions/workflows/ci.yml/badge.svg)](https://github.com/yigiterturk-dev/gelecekfinans/actions/workflows/ci.yml)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.6-111111?logo=nextdotjs)](https://nextjs.org/)

An editorial finance platform with a review-gated article workflow, third-party market-data adapters, SEO tooling, newsletter delivery, and a private operations console. Production AI writing automation is currently off and its daily model spend limit is `$0`; publishing remains under authenticated editor control.

> GelecekFinans is an information product, not a brokerage or trading system. Market data comes from third-party sources and may be delayed. Nothing in the product is investment advice.

![GelecekFinans desktop homepage](docs/screenshots/home-desktop.png)

## What is implemented

- Editorial workflow with `DRAFT`, `PUBLISHED`, `REJECTED`, and `ARCHIVED` states
- Provider-configurable AI research and writing pipeline with corroboration and editorial gates; production automation is disabled
- Authenticated admin console for articles, settings, breaking news, subscribers, bot runs, and analytics
- Market pages and calculators for currencies, gold, crypto assets, credit, deposits, and inflation
- 41 App Router API handlers covering content, market adapters, auth, newsletters, admin operations, and scheduled jobs
- Signed double opt-in and unsubscribe tokens with preference-based newsletter segmentation and A/B subject testing
- RSS, sitemap, structured data, Open Graph metadata, and dynamic SEO settings
- Responsive light/dark interface with keyboard focus states, a skip link, and reduced-motion handling

## Architecture

```text
Public Next.js UI
  ├─ editorial pages and finance tools
  ├─ cached third-party market adapters
  └─ signed newsletter enrollment
              │
        App Router APIs
  ├─ NextAuth-protected admin routes
  ├─ bearer-protected cron and bot routes
  ├─ input validation and content sanitization
  └─ fail-closed mail and token configuration
              │
       PostgreSQL + Prisma
  ├─ articles and publishing state
  ├─ subscribers and campaigns
  ├─ settings and breaking news
  └─ page views and bot-run ledger
```

The AI writer and external integrations are lazy-initialized, so missing optional provider keys do not prevent the application from building. Operations that need secrets fail closed at request time. Production currently selects the Gemini 2.5 Flash model through Google's OpenAI-compatible endpoint; the AI automation switch and daily spend cap keep it from making model calls. See the [live release record](docs/delivery/current-live-release-2026-11-23.md) and [AI cost audit](docs/delivery/ai-cost-audit-2026-11-23.md) for observed state and historical cost limits.

## Local development

Requirements: Node.js 20+, npm, and PostgreSQL.

```bash
git clone https://github.com/yigiterturk-dev/gelecekfinans.git
cd gelecekfinans
npm ci
cp .env.example .env
npm run db:push
npm run dev
```

Open `http://localhost:3000`. Create an administrator with `npm run create:admin` after configuring the database and auth variables.

The minimum local configuration is:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gelecekfinans"
NEXTAUTH_SECRET="replace-with-at-least-32-random-characters"
NEXTAUTH_URL="http://localhost:3000"
```

OpenAI, Resend, Unsplash, cron, and bot credentials are feature-specific. See [.env.example](.env.example) for the complete list. Never commit real secrets.

## Verification

```bash
npm run lint
npm test
npm run build
npm audit
```

CI runs lint, tests, a production build, and a production-dependency audit against an ephemeral PostgreSQL 17 service, matching production. See the [CI workflow](.github/workflows/ci.yml) for the exact commands. For live health, backup verification, AI spend state, and rollback steps, use the [production operations runbook](docs/operations.md).

## Security model

- Admin data mutations verify the server-side session; middleware is only an early navigation check.
- Scheduled and bot endpoints require configured bearer secrets and reject unset-secret configurations.
- Newsletter enrollment requires signed, purpose-bound, expiring tokens; unconfirmed recipients are excluded from delivery.
- Automated articles enter the editorial queue as drafts rather than publishing directly.
- Security headers and CSP are configured in `next.config.mjs`.

Please report vulnerabilities privately using [SECURITY.md](SECURITY.md).

## Screenshots

| Desktop | Mobile |
| --- | --- |
| ![Desktop homepage](docs/screenshots/home-desktop.png) | ![Mobile homepage](docs/screenshots/home-mobile.png) |

## Known limits

- Live provider credentials and production database contents are intentionally not included.
- External market APIs can be unavailable, rate-limited, or delayed; adapters use cached/fallback behavior.
- Email and AI-provider delivery require the corresponding runtime credentials and verified provider accounts.
- The automated suite focuses on deterministic content, signing, preference, and security helpers; it is not a substitute for production monitoring or an external penetration test.

## License

[MIT](LICENSE)

