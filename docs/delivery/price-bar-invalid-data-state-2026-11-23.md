# Price bar invalid data state

The global price strip now checks HTTP status and the top-level response shape, then only renders finite positive prices and finite percentage changes. If the API returns no usable prices, it shows an accessible unavailable message rather than an empty bar.

Validation: `git diff --check` passed. No tests or build were run.
