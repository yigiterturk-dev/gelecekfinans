# Search discovery improvement — 2026-11-23

The global search dialog previously requested the full public article list as
soon as any page mounted, even when the visitor never opened search. It also
had no way to reach the full archive search from the eight autocomplete hits.

The article-list request now starts only when the dialog opens, is aborted if
the dialog closes while the request is pending, and shows loading/failure
states. Matching now includes title, description and category with Turkish
case/diacritic normalization. Queries can continue to the existing paginated
`/arsiv?q=...` search, which also matches article keywords and descriptions.

Suggestion rows are links and can be reached by keyboard. Focus moves to the
query field when the dialog opens, stays within the modal while tabbing, and
returns to the search trigger when it closes. Arrow/Enter shortcuts control
suggestions only while the query field has focus.

If the initial request fails, the dialog now provides an in-place retry button
instead of requiring the visitor to close and reopen search. The button has a
visible keyboard focus state, and the failure is announced to assistive
technology.

Verification: source review and `git diff --check` only. No tests or build were
run in this iteration.
