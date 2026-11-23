# Google Analytics consent gate

`GoogleAnalytics` now waits for accepted analytics consent before requesting `/api/site-config`. If consent changes while the request is in flight, the effect ignores its result. It uses the same five-minute in-memory request cache as ad slots, so simultaneous integrations share one request.

The client checks the response status and validates the returned GA4 ID before using it in either script URL or configuration. This avoids an unnecessary configuration request before consent and prevents malformed response data from reaching the analytics scripts.

Validation: `git diff --check` passed for the changed component. No tests or build were run.
