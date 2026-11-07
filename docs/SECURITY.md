# Security Model

## Threat Model

The utility parses potentially untrusted HTML. It is designed to be safe against DoS via extreme inputs.

### Defended
- **Huge Inputs**: Processing is bounded to a default of 1,000,000 UTF-16 code units. Requests exceeding this threshold raise `A11yAuditError` with code `INPUT_TOO_LARGE`.
- **Deep Nesting**: The parser enforces a maximum nesting depth of 256. Exceeding this raises `A11yAuditError` with code `TOO_DEEP`.
- **Infinite Recursion**: `accname` calculation for `aria-labelledby` uses a `visited` Set to prevent cyclic reference recursion.

### Not Defended
- **Semantic Accuracy**: The tool evaluates HTML against specified rules. It does not perform validation of accessibility intent (e.g., whether an 'alt' text accurately describes the image) or valid application of ARIA roles outside the explicit `aria-valid-attr` rule.
- **Complex JS Execution**: The utility is purely static; it does not execute scripts, load external resources, or render CSS.