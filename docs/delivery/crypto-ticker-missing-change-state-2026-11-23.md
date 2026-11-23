# Crypto ticker missing change state

When the upstream 24-hour percentage change is unavailable or non-finite, the ticker now displays a neutral dash with an accessible label instead of showing a misleading green `+0.00%`. Valid zero changes remain a real numeric value.

Validation: `git diff --check` passed. No tests or build were run.
