# Offline Static HTML Accessibility Auditing via Tolerant AST and Accname Subset

Status: accepted (generated, pending human review)

## Context

Accessibility checks in component libraries and micro-frontends frequently run late in end-to-end browser suites. Running axe-core in unit tests requires heavy DOM emulators (jsdom/happy-dom) that slow test runners down.

## Decision

Implement an offline, zero-dependency linear HTML tokenizer and tree builder bounded by explicit max-length and max-depth thresholds. Compute accessible names using an accname 1.2 subset and evaluate 9 core WCAG 2.2 rules directly against the tree.

## Consequences

Tests run orders of magnitude faster without jsdom or browser overhead. Subtle browser-specific CSS layout or contrast calculations remain out of scope and are delegated to runtime integration testing.
