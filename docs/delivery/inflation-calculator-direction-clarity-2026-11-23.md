# Inflation calculator direction clarity

The calculator previously showed two outputs derived from opposite interpretations of one unlabeled input amount. It now asks users to choose a direction: carry a past amount forward with `amount × (1 + inflation)`, or deflate today's amount with `amount ÷ (1 + inflation)`. The input label, primary result, and tool description follow that choice; the second result shows the signed nominal difference between the two periods.

Validation: `git diff --check` passed. No tests or build were run.
