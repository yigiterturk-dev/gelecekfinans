# Ad slot config consent gate

`AdSlot` now waits for accepted privacy consent before requesting `/api/site-config`. A cancelled component ignores the response if its consent or slot position changes before the response arrives. Nonaccepted consent also clears any previously loaded slot configuration.

The shared client cache deduplicates simultaneous requests from multiple ad slots and Google Analytics, and refreshes the value after five minutes. The response status and object shape are checked before use. Publisher and slot IDs must match their expected formats, and a slot is enabled only when its configuration value is exactly `true`.

Validation: `git diff --check` passed for the changed component. No tests or build were run.
