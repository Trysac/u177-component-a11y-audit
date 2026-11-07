import type { RuleId } from "./types.js";

export const ALL_RULES: readonly RuleId[] = [
  "image-alt",
  "button-name",
  "link-name",
  "label",
  "duplicate-id",
  "aria-valid-attr",
  "tabindex",
  "heading-order",
  "aria-hidden-focus",
] as const;

export const WCAG_MAP: Record<RuleId, string | null> = {
  "image-alt": "1.1.1",
  "button-name": "4.1.2",
  "link-name": "2.4.4",
  label: "4.1.2",
  "duplicate-id": null,
  "aria-valid-attr": "4.1.2",
  tabindex: null,
  "heading-order": null,
  "aria-hidden-focus": "4.1.2",
};

/**
 * HTML void elements that cannot have end tags or child nodes.
 */
export const VOID_TAGS: ReadonlySet<string> = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * Valid ARIA attributes from ARIA 1.2 specification (all prefixed with aria-).
 */
export const VALID_ARIA_ATTRIBUTES: ReadonlySet<string> = new Set([
  "aria-activedescendant",
  "aria-atomic",
  "aria-autocomplete",
  "aria-busy",
  "aria-checked",
  "aria-colcount",
  "aria-colindex",
  "aria-colspan",
  "aria-controls",
  "aria-current",
  "aria-describedby",
  "aria-details",
  "aria-disabled",
  "aria-dropeffect",
  "aria-errormessage",
  "aria-expanded",
  "aria-flowto",
  "aria-grabbed",
  "aria-haspopup",
  "aria-hidden",
  "aria-invalid",
  "aria-keyshortcuts",
  "aria-label",
  "aria-labelledby",
  "aria-level",
  "aria-live",
  "aria-modal",
  "aria-multiline",
  "aria-multiselectable",
  "aria-orientation",
  "aria-owns",
  "aria-placeholder",
  "aria-posinset",
  "aria-pressed",
  "aria-readonly",
  "aria-relevant",
  "aria-required",
  "aria-roledescription",
  "aria-rowcount",
  "aria-rowindex",
  "aria-rowspan",
  "aria-selected",
  "aria-setsize",
  "aria-sort",
  "aria-valuemax",
  "aria-valuemin",
  "aria-valuenow",
  "aria-valuetext",
]);
