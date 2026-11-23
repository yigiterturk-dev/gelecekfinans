# Crypto guide source and scope correction — 2026-11-23

Updated the published guide at `/kripto-para-nedir-tanim-calisma-prensipleri-kullanim-ve-riskler` after finding an unrelated TÜİK link and two unrelated internal links in the body.

- Replaced blanket claims that all crypto assets are decentralized, public, or validated by a network majority with wording that distinguishes protocols and issuers.
- Added a practical SPK note: its current “Faaliyette Bulunanlar Listesi” page states that appearing on the list does not by itself mean the provider is authorized.
- Added the Bitcoin whitepaper as a Bitcoin design example only, plus SPK sources for provider regulation and the current list.
- Removed the unrelated TÜİK link and two internal links to unrelated TCMB stories.
- Left the evidence metadata unchanged. The article remains unverified and in the legacy editorial queue.

Before the production content write, `/opt/gelecekfinans-db/yedek/gf-20261123.dump` was refreshed at 04:20 CET and restored with `pg_restore --exit-on-error` in a network-disabled PostgreSQL 17 container. The restore contained 14 public tables and 214 articles. No schema change or model call was made.

The exact prior row is protected on the server at `/root/gf-crypto-article-before-20261123.json` (mode 0600). Prisma read-back confirmed the article remains `PUBLISHED`, the off-topic links are gone, and evidence metadata is unchanged. After the 300-second ISR refresh, the public URL returned HTTP 200 with the scoped wording and source links; the obsolete TÜİK and unrelated internal URLs were absent.
