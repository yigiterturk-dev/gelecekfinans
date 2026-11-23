# TradingView symbol validation

The chart embed now accepts only bounded exchange/ticker symbols made of letters, digits, dot, underscore, colon, or hyphen before placing the value into the third-party widget configuration script. Invalid symbols leave the embed empty rather than entering script text.

Validation: `git diff --check` passed. Current uses (`BIST:XU100` and `BIST:<ticker>`) fit the allowed format. No tests or build were run.
