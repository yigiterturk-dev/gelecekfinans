# Price bar neutral zero change

The price strip no longer marks a zero percentage change with an upward arrow and positive color. Positive values retain the green up arrow, negative values retain the red down arrow, and exactly zero is shown neutrally without a directional arrow.

Validation: `git diff --check` passed. No tests or build were run.
