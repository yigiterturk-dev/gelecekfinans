# GelecekFinans

[![CI](https://github.com/moriana55/gelecekfinans/actions/workflows/ci.yml/badge.svg)](https://github.com/moriana55/gelecekfinans/actions/workflows/ci.yml)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3-111111?logo=nextdotjs)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/tests-11%2F11-0a8f4e)](./tests)
[![Security audit](https://img.shields.io/badge/npm_audit-0_vulnerabilities-0a8f4e)](./docs/showcase-audit.md)

An editorial finance platform built around a clear publishing boundary: automated research can create drafts, but only an authenticated editor can publish them. The application combines financial content, third-party market-data adapters, SEO tooling, newsletter delivery, and a private operations console in one production-oriented Next.js codebase.

> GelecekFinans is an information product, not a brokerage or trading system. Market data comes from third-party sources and may be delayed. Nothing in the product is investment advice.

![GelecekFinans desktop homepage](docs/screenshots/home-desktop.png)

## What is implemented

- Editorial workflow with `DRAFT`, `PUBLISHED`, `REJECTED`, and `ARCHIVED` states
- Review-gated OpenAI article pipeline; bot-created articles remain drafts
- Authenticated admin console for articles, settings, breaking news, subscribers, bot runs, and analytics
- Market pages and calculators for currencies, gold, crypto assets, credit, deposits, and inflation
- 31 App Router API handlers covering content, market adapters, auth, newsletters, admin operations, and scheduled jobs
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

The AI writer and external integrations are lazy-initialized, so missing optional provider keys do not prevent the application from building. Operations that need secrets fail closed at request time.

## Local development

Requirements: Node.js 20+, npm, and PostgreSQL.

```bash
git clone https://github.com/moriana55/gelecekfinans.git
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

OpenAI, Resend, Vercel Blob, Unsplash, cron, and bot credentials are feature-specific. See [.env.example](.env.example) for the complete list. Never commit real secrets.

## Verification

```bash
npm run lint
npm test
npm run build
npm audit
```

CI repeats these checks against an ephemeral PostgreSQL 16 service. The current evidence set is 11 passing tests, a successful production build, and zero known npm audit vulnerabilities. See the [showcase audit](docs/showcase-audit.md) for scope and limitations.

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

