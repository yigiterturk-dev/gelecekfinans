# Crypto market response IDs

The CoinGecko adapter now requires each returned coin to have a bounded, URL-safe ID and removes duplicate IDs before returning the market list. This keeps malformed upstream rows from producing empty or duplicate React keys in the crypto market table.

Validation: `git diff --check` passed. No tests or build were run.
