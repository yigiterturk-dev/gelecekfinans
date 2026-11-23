# FX, gold, and diversification corrections — 2026-11-23

Updated three published production guides:

- The USD/TRY guide now states that TCMB announces indicative rates at 15:30 and that the USD/TRY reference rate uses six observations from 10:00–15:00. It clarifies the rate does not determine the rate private counterparties must use. Official TCMB policy and method links replace the generic homepage link.
- The gold-price guide now describes safe-haven and inflation-hedge behavior as conditional, not assured, and says price responses depend on other factors. It links the World Gold Council's factor framework and identifies the limits of that source.
- The diversification guide now says diversification may reduce concentration risk, but does not guarantee a higher return, offset every loss, or prevent broad market declines. It links Investor.gov education material.

Before mutation, the production dump was refreshed at 05:29 CET and restored in a network-disabled PostgreSQL 17 container. Restore completed with 14 public tables and 214 articles. Exact target rows are preserved at `/root/gf-fx-gold-diversification-before-20261123.json` (mode 0600). All three stayed `PUBLISHED`; `automationMeta` and `aiExtras` remained unchanged. No verification marker was changed and no model call was made.

All three public routes returned HTTP 200 with `x-nextjs-cache: HIT`; updated method/caveats/source sections were present, and the generic TCMB homepage links were absent. These pages remain in claim-level editorial review.
