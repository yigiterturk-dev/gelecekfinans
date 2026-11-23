# Legacy crypto source corrections — 2026-11-23

Read-only production inventory found five more published crypto guides ending in an unrelated TÜİK link. Replaced those paragraphs with scoped sources:

- Blockchain guide: NISTIR 8202 and the Bitcoin paper, explicitly limiting the latter to Bitcoin.
- Exchange-selection guide: SPK provider list and regulation notice, including SPK's warning that listing alone does not establish authorization.
- Bitcoin price-risk guide: SEC Investor.gov volatility/risk material, with a note that it is not a price forecast or a source for any particular market move.
- Wallet guide: Bitcoin developer wallet documentation and Ethereum wallet/key security guidance.
- Stablecoin guide: BIS material on reserves, redemption, and the possibility of deviating from par; the scope note says terms differ by project.

Before the production write, `/opt/gelecekfinans-db/yedek/gf-20261123.dump` was refreshed at 04:47 CET and restored with `pg_restore --exit-on-error` in a network-disabled PostgreSQL 17 container (14 public tables, 214 articles). The exact five prior rows are protected at `/root/gf-crypto-links-before-20261123.json` (mode 0600). Prisma read-back confirmed the rows remain published, the TÜİK URLs are gone, and their evidence metadata is unchanged. No model call or schema change was made.

After the 300-second ISR refresh, all five public URLs returned HTTP 200 with their replacement source links; the old TÜİK URLs were absent. All five remain in the legacy review queue because adding relevant links does not itself prove claim-level verification.
