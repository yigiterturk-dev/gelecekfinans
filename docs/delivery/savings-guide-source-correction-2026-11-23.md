# Savings guide source correction — 2026-11-23

Replaced the guide's generic TCMB homepage citation with scoped investor-education sources:

- SPK guidance on investment goals, diversification, and risk.
- SPK's fund guide for risk values, fees, and past-performance caveats.
- SEC Investor.gov material on asset allocation, diversification, time horizon, and risk tolerance.

The source-scope note says tax and product terms vary and should be checked in current official tax material and the product's investor information form/prospectus. This is not a claim that the three links verify every sentence.

Before the production write, `/opt/gelecekfinans-db/yedek/gf-20261123.dump` was refreshed at 04:53 CET and restored with `pg_restore --exit-on-error` in a network-disabled PostgreSQL 17 container (14 public tables, 214 articles). The exact prior row is protected at `/root/gf-savings-before-20261123.json` (mode 0600). Prisma read-back confirmed `PUBLISHED` status and unchanged `verifiedEvidence=false` metadata. No model call or schema change was made.

Public route returned HTTP 200 with `x-nextjs-cache: HIT`; the SPK and Investor.gov references were visible and the generic TCMB homepage link was absent. The article remains in the legacy review queue.
