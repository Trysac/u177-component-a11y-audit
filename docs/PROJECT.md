# Project record: component-a11y-audit

## Objective
Static accessibility audit of rendered component HTML strings to catch common accessibility defects early in the unit testing phase, targeting developers who want to avoid heavy browser-based testing for simple markup accessibility.

## Scope
- The defined public API and CLI runner.
- The 9 implemented accessibility rules.
- Bounded, tolerant HTML tokenizer.
- Accessible name computation (subset of accname 1.2).

## Out of Scope
- Colour contrast evaluation.
- CSS-based accessibility rule checking.
- Runtime focus order verification.
- ARIA role validity (semantic structure outside of the defined rules).
- Quality control of alt text (the library checks for presence and compute name, not accuracy).
- Full framework integration (library operates on HTML strings only).

## Timeline
| Date | Milestone |
|---|---|
| 2026 | Initial release of component-a11y-audit from factory template. |

## Effort metrics
| Metric | Value | Source |
|---|---|---|
| Tokens (input / output) | 1365215 / 19906 | factory ledger |
| Hours (human) | pending measurement | time log |
| Cost (USD) | 0.2742 | factory ledger |

## Factory run u177 (measured from API usage)

| Phase | Model | Batch | Input | Output | Cache write | Cache read | Cost (USD) |
|---|---|---|---|---|---|---|---|
| generation | gemini-3.8-flash | yes | 4642 | 12713 | 0 | 0 | 0.0256 |
| fix-1 | gemini-3.8-flash | no | 33067 | 1328 | 0 | 108414 | 0.0379 |
| fix-2 | gemini-3.8-flash | no | 26881 | 550 | 0 | 45060 | 0.0256 |
| fix-3 | gemini-3.8-flash | no | 95175 | 3162 | 0 | 942477 | 0.1539 |
| fix-4 | gemini-3.8-flash | no | 17934 | 378 | 0 | 13465 | 0.0159 |
| audit | gemini-3.1-flash-lite | no | 30797 | 164 | 0 | 30416 | 0.0087 |
| docs | gemini-3.1-flash-lite | no | 16887 | 1611 | 0 | 0 | 0.0066 |

Total: $0.2742. Prices: Anthropic list prices.
