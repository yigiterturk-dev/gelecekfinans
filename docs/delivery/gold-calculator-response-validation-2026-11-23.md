# Gold calculator response validation

The gold calculator now checks the HTTP response and validates the API payload before saving prices. It keeps only finite, positive prices for known gold types; malformed responses resolve to the existing unavailable state rather than causing a render error. An unmounted calculator aborts the request and ignores its completion.

Validation: `git diff --check` passed. No tests or build were run.
