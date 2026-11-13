# GelecekFinans — visual revision, 1 November 2026

User request: “tasarımı güzelleştirsene la”. Scope: reversible implementation in the existing publication, preserving its navy identity, IBM Plex typography, published content and editorial-media policy.

Changes: clearer masthead, separate market menu, full visible chart covers, larger headline, quieter news grids and sidebar, responsive article rows, newsletter layout and calculator discovery.

Preview uses an isolated PostgreSQL database on port 55437 containing 50 public RSS entries, with existing cover references extracted from the public homepage. Article bodies are RSS descriptions for preview purposes. No production records were modified. No new synthetic documentary images were generated.

## Preview repair

- The user's Safari screenshot showed a fully unstyled page. Initial HTTP 200 checks did not establish successful browser rendering.
- HTTPS upgrade and HSTS headers now apply only in production; Safari otherwise upgrades HTTP localhost assets.
- Development uses Webpack to change the stylesheet pipeline and asset URLs. Its stylesheet `/_next/static/css/app/layout.css` returned HTTP 200 and contained the new layout rules.
- Development scripts permit `unsafe-eval`, required by Next.js development tooling. Production does not permit it; production upgrade and HSTS checks passed.
- The user has been asked to verify the refreshed Safari preview. Browser visual QA remains pending; HTTP checks are not visual proof.

Validation: ESLint, TypeScript and the production build passed. Production deployment is not authorized by this record and has not been performed.
