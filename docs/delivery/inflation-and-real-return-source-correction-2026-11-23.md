# Inflation and real-return guide corrections — 2026-11-23

Updated two published legacy guides in production:

- The inflation guide now points to the TÜİK October 2026 CPI release and TCMB consumer-price series instead of the generic TCMB homepage. The source note limits their scope to CPI/index data and does not claim they validate every explanatory example.
- The real-return guide now labels nominal return minus inflation as an approximation and distinguishes it from the compound Fisher relation. It states that rates must be decimals for the formula and must cover the same period. The source section links the TCMB inflation/price-stability document and TÜİK CPI release, and notes that tax and product costs are excluded.

Before mutation, the 04:56 CET production dump was restored in an isolated, network-disabled PostgreSQL 17 container. Restore completed with 14 public tables and 214 articles. Exact prior target rows are preserved in `/root/gf-inflation-real-before-20261123.json` (mode 0600). Both rows stayed `PUBLISHED`; `automationMeta` and `aiExtras` were unchanged. No verification/evidence marker was changed and no model call was made.

Public routes returned HTTP 200 with `x-nextjs-cache: HIT`. The new TÜİK/TCMB links, Fisher summary, and same-period/decimal note were present in the rendered pages. Both articles remain in the claim-level editorial review queue.
