# Editorial link quality guard — 2026-11-23

## Findings and changes

- The internal linker accepted any positive keyword overlap, and the backfill tool only removed generic one-word anchors. This left links such as `Türkiye` to an unrelated central-bank profile and `fiyat istikrarı` to unrelated market stories.
- The crypto category's automatic external-source map pointed first to TÜİK and linked broad words such as `ekonomi`; TÜİK does not support crypto-market, wallet, or blockchain claims.
- Internal anchors now require stronger topical overlap. Single-word anchors are limited to a small allowlist of specific network, institution, and market identifiers. Multiword keywords made entirely of broad terms are rejected.
- The backfill cleaner removes anchors whose words are all generic. A deterministic dry run scanned 154 published BOT articles, first flagged 87 rows, and found zero remaining link-cleanup targets after the changes.
- Those 87 rows were updated in the first pass; three rows were reapplied after the final phrase guard stopped `fiyat istikrarı` from being reinserted. Article status and evidence markers were not changed.
- Replaced irrelevant TÜİK links in five more crypto guides with scoped NIST, SPK, SEC Investor.gov, Bitcoin/Ethereum, and BIS sources. The crypto category now has no remaining TÜİK body link in its published BOT inventory.

## Verification and cost

- TypeScript checks passed, and the isolated production build completed TypeScript plus 296 static pages. No tests were run.
- Build `e-Ho3P296WXCJ84NXLIeU` is live. Systemd reports active, `NRestarts=0`, and AI automation remains disabled; the news and guide timers are inactive.
- The five replacement-source pages and the two previously corrected guides returned HTTP 200 with the new public content after ISR refresh.
- Final read-only link backfill audit again scanned 154 published BOT articles and found zero cleanup targets. The three pages from the last cleanup pass also returned HTTP 200 after their cache refreshed.
- Before each database-write batch, the latest dump was restored with `pg_restore --exit-on-error` in a network-disabled PostgreSQL 17 container. The final five-guide batch's exact prior rows are protected at `/root/gf-crypto-links-before-20261123.json` (mode 0600).
- No model call was made. Build and link backfill ran with API keys blank; the backfill is deterministic and does not invoke a language model.

## Review boundary

These corrections improve sources and internal navigation; they do not verify every sentence in these older BOT articles. The affected guides remain in the legacy review queue with `verifiedEvidence=false`.
