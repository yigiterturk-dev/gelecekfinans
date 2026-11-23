# Google Reader Revenue consent gate — 2026-11-23

The Google Reader Revenue Manager (`swg-basic.js`) snippet was loaded on every
page before a visitor answered the privacy banner. That conflicted with the
banner's optional-services choice. The integration now loads only after
`accepted`, using the same consent store as Analytics and AdSense. The banner
and both privacy pages now disclose the integration and link to Google's
Publisher Center help.

Google's Reader Revenue Manager help describes configured calls to action and
the default popup behavior, which is why the disclosure describes reader
revenue prompts as possible rather than guaranteed:
https://support.google.com/news/publisher-center/answer/16941185

Verification: source review and `git diff --check` only. No tests, build,
browser check or deployment were run.
