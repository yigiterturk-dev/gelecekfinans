# Macro guide source corrections — 2026-11-23

Updated three published guides in production:

- Policy-rate guide now links TCMB's monetary-policy framework and its PPK/policy-rate explainer. Its scope note says market effects are transmission channels, not guaranteed outcomes.
- Current-account-deficit guide now links TCMB balance-of-payments statistics and the official metadata document defining the current-account coverage. Its note limits the sources to definition/statistical scope.
- Central-bank guide now links the 1211 law and TCMB's FAQ. It distinguishes duties set for the Turkish central bank from the differing roles of other countries' central banks.

Before mutation, `/opt/gelecekfinans-db/yedek/gf-20261123.dump` was refreshed at 05:25 CET and restored in a network-disabled PostgreSQL 17 container. Restore completed with 14 public tables and 214 articles. Exact target rows are preserved at `/root/gf-macro-guides-before-20261123.json` (mode 0600). All three remain `PUBLISHED`; `automationMeta` and `aiExtras` were unchanged. No evidence marker was altered and no model call was made.

All three public routes returned HTTP 200 with `x-nextjs-cache: HIT`, showing the new source sections and no generic TCMB homepage link. The pages remain in claim-level review.
