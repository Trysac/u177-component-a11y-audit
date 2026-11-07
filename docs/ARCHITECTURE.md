# Architecture

`@trysac/component-a11y-audit` is designed for offline, deterministic accessibility auditing of HTML component strings in unit tests and CI pipelines.

## Core Principles

1. **Zero Browser / DOM Runtime Dependencies**:
   Traditional accessibility tooling like axe-core requires a live browser engine or jsdom. This library audits rendered HTML strings purely in memory using a lightweight, linear tokenizer.
2. **Bounded Resource Execution**:
   Untrusted markup inputs are bound by configurable size limits (`maxLength`, default 1,000,000 code units) and nesting depths (`maxDepth`, default 256), throwing typed `A11yAuditError` instances on boundary breaches.
3. **Accname Subset Resolution**:
   Calculates accessible names following W3C Accessible Name and Description Computation 1.2 priority order: `aria-labelledby` referencing identifiers in the fragment, `aria-label`, descendant text (including image `alt`), and fallback `title` attributes.
4. **WCAG 2.2 Mapping**:
   Rules map directly to WCAG 2.2 Success Criteria. Obsolete criteria (such as 4.1.1 Parsing) are treated as best practice with null WCAG mappings.
