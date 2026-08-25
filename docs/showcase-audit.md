# Showcase audit — 2026-08-13

This document records the evidence behind the public portfolio claims in the README. It is a repository review, not a penetration test or a financial-data certification.

## Verified locally

| Check | Result |
| --- | --- |
| ESLint | Pass |
| Node test runner | 11/11 pass |
| Next.js production build | Pass |
| Generated application routes | 78 |
| npm audit | 0 known vulnerabilities |
| Desktop homepage render | Reviewed at 1440 × 1000 |
| Mobile homepage render | Reviewed at 390 × 844 |
| Reduced-motion stylesheet | Present |
| Keyboard skip link and focus treatment | Present |

## Security review changes

- Upgraded Next.js, NextAuth, and affected transitive dependencies.
- Changed OpenAI initialization to occur only when the writer is invoked.
- Made newsletter signing configuration fail closed.
- Removed the unsigned email-based unsubscribe fallback.
- Reset confirmation state when an existing address subscribes again.
- Limited scheduled newsletter recipients to active, confirmed subscribers.
- Returned actual provider delivery counts instead of requested-recipient counts.
- Prevented confirmation links and signed tokens from being written to logs.

## Tests in scope

The deterministic suite covers slug creation, HTML-to-text conversion, reading-time calculation, password hashing, newsletter preference normalization, secret absence, signed opt-in/unsubscribe tokens, expiry, tampering, and purpose isolation.

## Outside this audit

- Production credentials, customer data, DNS, provider account settings, and deployment logs
- Accuracy or latency guarantees for third-party market data
- Deliverability guarantees for Resend or content-quality guarantees for OpenAI
- Browser coverage beyond the documented desktop and mobile Chromium review
- Independent penetration testing, load testing, and financial compliance review

## Reproduce

With PostgreSQL and the variables described in `.env.example` configured:

```bash
npm ci
npm run db:push
npm run lint
npm test
npm run build
npm audit
```
