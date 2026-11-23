# Neutral zero-change display

Extended the price bar's neutral zero-change treatment to the crypto ticker and compact market widget. Exactly zero now uses muted text without an up arrow or positive color; unavailable changes remain distinct, while positive and negative values retain their directional styling.

Validation: `git diff --check` passed. No tests or build were run.
