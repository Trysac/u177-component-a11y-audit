# @trysac/component-a11y-audit

[![CI](https://github.com/Trysac/u177-component-a11y-audit/actions/workflows/ci.yml/badge.svg)](https://github.com/Trysac/u177-component-a11y-audit/actions/workflows/ci.yml)

Offline, zero-dependency static accessibility linter for rendered component HTML strings. Evaluates 9 rules mapped to WCAG 2.2 with a bounded, tolerant HTML tokenizer.

## The Problem
Component libraries often ship accessibility defects (e.g., missing labels, nameless buttons, or aria-hidden focus traps) because browser-based audits run late in the development lifecycle and require heavy headless browser environments in CI. Most of these defects are visible in the rendered HTML string a unit test already produces.

## Why not axe-core?
`axe-core` requires a live DOM (browser/jsdom) and is resource-intensive for simple unit tests. This library audits HTML strings in isolation using a lightweight, synchronous, and bounded tokenizer that runs in any Node.js environment.

## Installation

```bash
npm install @trysac/component-a11y-audit
```

## Usage Example

```typescript
import { auditHtml } from '@trysac/component-a11y-audit';

// Finds missing alt attributes
const { findings } = auditHtml('<img src="logo.png">');
console.log(findings[0].message); // "Image element is missing an alt attribute."
```

## Public API

- `auditHtml(html: string, options?: AuditOptions): AuditResult`
- `formatFindings(result: AuditResult, format: 'text' | 'json'): string`
- `run(argv: string[], io: CliIo): Promise<number>`

### Options
- `rules`: Optional `RuleId[]` (defaults to all).
- `maxLength`: Limit for input length (default: `1_000_000`).
- `maxDepth`: Limit for nesting depth (default: `256`).

### Rules
- `image-alt` (WCAG 1.1.1)
- `button-name` (WCAG 4.1.2)
- `link-name` (WCAG 2.4.4)
- `label` (WCAG 4.1.2)
- `aria-valid-attr` (WCAG 4.1.2)
- `aria-hidden-focus` (WCAG 4.1.2)
- `duplicate-id` (Best practice)
- `tabindex` (Best practice)
- `heading-order` (Best practice)

## Security
See [docs/SECURITY.md](docs/SECURITY.md) for limits on input size and nesting depth.