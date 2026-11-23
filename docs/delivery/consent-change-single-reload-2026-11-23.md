# Consent change reload

Changing a previously saved consent preference now relies on the consent subscription effect for the page reload. The click handler no longer also calls `location.reload`, avoiding duplicate navigation while preserving one reload for both same-tab and cross-tab changes. First-time choices still apply without a reload.

Validation: `git diff --check` passed. No tests or build were run.
