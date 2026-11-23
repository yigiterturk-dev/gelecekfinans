# Gold investment and wage-inflation corrections — 2026-11-23

Updated two published guides in production:

- The gold-investment guide no longer implies that bank gold accounts usually offer tighter spreads. It tells readers that spreads depend on institution, product, and time, and to compare current prices and fee schedules. It now links Borsa İstanbul's precious-metals market and SPK fund disclosures for their respective scopes.
- The minimum-wage guide now distinguishes the statutory floor from gross pay, take-home pay, and employer cost. It describes wage/inflation effects as conditional and potentially two-way, rather than an automatic price spiral. It links the Ministry's minimum-wage regulation and TCMB's period-specific wage-dynamics analysis.

Before mutation, the production dump was refreshed at 05:32 CET and restored in a network-disabled PostgreSQL 17 container. Restore completed with 14 public tables and 214 articles. Exact target rows are preserved at `/root/gf-gold-investment-wage-before-20261123.json` (mode 0600). Both rows stayed `PUBLISHED`; `automationMeta` and `aiExtras` were unchanged. No evidence marker was altered and no model call was made.

Both public routes returned HTTP 200 with `x-nextjs-cache: HIT`. New source sections appeared and generic TCMB homepage links were absent. These articles remain in claim-level review.
