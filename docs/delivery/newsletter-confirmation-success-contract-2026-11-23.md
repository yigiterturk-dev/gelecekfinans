# Newsletter confirmation success contract — 2026-11-23

The signup form now accepts success only when the API confirms that the
request was accepted, double opt-in is required, and the confirmation email
was sent. A successful HTTP status with an absent or malformed body no longer
claims that a subscriber is registered. The email and preferences remain in
the form so the visitor can retry.

Verification: compared the client checks with the response returned by
`POST /api/newsletter`; `git diff --check` only. No tests or build were run.
