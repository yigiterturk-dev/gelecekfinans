# FX investment guide source correction — 2026-11-23

Updated the published guide at `/doviz-yatirimi-nedir-nasil-calisir-ve-nelere-dikkat-edilir` after a read-only legacy audit found no source links in its body.

- Reworded the cross-rate explanation to match the TCMB glossary: an indirect exchange rate between two currencies, commonly calculated from each currency's value against a third currency.
- Added three primary-source links scoped to the claims they support: TCMB terminology, SPK's leveraged FX risk notice, and Borsa İstanbul's FX futures contract specifications.
- Added a scope note explaining that bank, fund, and other product terms vary by institution and governing documents.
- Kept the article's existing evidence metadata unchanged. Adding links did not mark the article verified or fully reviewed; it remains in the legacy editorial queue.

Before the production content write, `/opt/gelecekfinans-db/yedek/gf-20261123.dump` was refreshed at 04:14 CET and restored with `pg_restore --exit-on-error` in a network-disabled PostgreSQL 17 container. The restore contained 14 public tables and 214 articles. No schema change or model call was made.

The exact prior article row is protected on the server at `/root/gf-fx-article-before-20261123.json` (mode 0600). The live row remains `PUBLISHED`; Prisma read-back confirmed the corrected paragraph, all three links, and unchanged evidence metadata. After the 300-second ISR refresh, the public URL returned HTTP 200 with the corrected paragraph and all three links.
