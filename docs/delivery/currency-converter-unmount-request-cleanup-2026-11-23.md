# Currency converter request cleanup

The exchange-rate fetch now uses an `AbortController`; when the converter unmounts, it aborts the request and ignores the failure-state update. This prevents an unused page's request from continuing and avoids state updates after teardown.

Validation: `git diff --check` passed. No tests or build were run.
