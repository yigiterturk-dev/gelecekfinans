# SafeImage source refresh

`SafeImage` now associates failure state with the exact primary and fallback sources. When a card or search result is reused with a corrected image URL, its old error state no longer forces the stale fallback or branded error surface to remain visible.

Validation: `git diff --check` passed. No tests or build were run.
