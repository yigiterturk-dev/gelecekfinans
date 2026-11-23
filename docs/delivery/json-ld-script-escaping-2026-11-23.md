# JSON-LD script escaping

Added a shared `serializeJsonLd` helper and applied it to the site's structured-data script blocks, including article metadata, market and calculator pages, FAQs, organization data, and editorial pages.

The serializer escapes `<`, `>`, `&`, U+2028, and U+2029 in the JSON text. This keeps stored or otherwise dynamic values from terminating an HTML script element while preserving the original JSON values when parsed.

Validation: searched all `application/ld+json` blocks under `app` and `components` and confirmed they use the shared serializer; `git diff --check` passed. No tests or build were run.
