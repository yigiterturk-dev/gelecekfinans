# Market widget polling lifecycle

The global price strip, crypto ticker, and homepage movers now poll again 60 seconds after each request completes instead of using fixed intervals. Their active requests are aborted on unmount, failed responses preserve the last successful snapshot, and no state updates or new timers are scheduled after teardown.

Validation: `git diff --check` passed. No tests or build were run.
