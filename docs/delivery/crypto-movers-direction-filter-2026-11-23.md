# Crypto movers direction and empty states

The homepage movers now show only positive changes under “Yükselenler” and only negative changes under “Düşenler”; unchanged coins are excluded. Non-finite and missing changes are not ranked. Rows use CoinGecko IDs for stable React keys, and completed requests with no matching data show an explicit empty state instead of an endless skeleton.

Validation: `git diff --check` passed. No tests or build were run.
