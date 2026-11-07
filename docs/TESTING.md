# Testing

## Tools
- [Vitest](https://vitest.dev/) runs the suites.
- Coverage collected with `@vitest/coverage-v8`.

## Coverage
- `test/index.test.ts`: This file contains all test cases.

## Coverage Scope
- `image-alt` (WCAG 1.1.1) verification, including decorative empty alt handling.
- `button-name` (WCAG 4.1.2) resolution via text, `aria-label`, `img alt`, and `title`.
- Form label association (via `for` attribute and wrapping `label` elements) and link name verification.
- `duplicate-id` detection and `aria-valid-attr` (checking for typos in ARIA attributes).
- `tabindex` positive value detection and `heading-order` logic (hierarchy jumps).
- `aria-hidden-focus` protection (ensures elements inside aria-hidden are not focusable).
- Input bounds enforcement (too large strings) and nesting depth limits (TOO_DEEP).
- `accname` resolution tests including complex nested elements.
- CLI runner integration: verifies correct exit codes (0, 1, 2) and output for various file inputs and formats.