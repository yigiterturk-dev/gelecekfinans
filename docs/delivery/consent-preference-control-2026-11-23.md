# In-site privacy preference controls — 2026-11-23

Visitors who had already accepted or rejected the consent banner had no
on-site control to change the saved choice; the cookie policy told them to
clear browser data. The footer now has a **Çerez tercihleri** action that
reopens the banner. Changing a saved choice reloads the page so already
inserted third-party scripts do not remain active under the previous choice.

Consent is also kept in a session-memory fallback if local storage is blocked,
and storage events synchronize saved preferences across tabs. The policy now
describes the footer control.

Verification: source review and `git diff --check` only. No tests, build,
browser check or deployment were run.
