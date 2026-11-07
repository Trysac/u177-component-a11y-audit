/**
 * Supported accessibility audit rule identifiers.
 */
export type RuleId =
  | "image-alt"
  | "button-name"
  | "link-name"
  | "label"
  | "duplicate-id"
  | "aria-valid-attr"
  | "tabindex"
  | "heading-order"
  | "aria-hidden-focus";

/**
 * Configuration options for HTML accessibility auditing.
 */
export interface AuditOptions {
  /** Subset of rules to execute. Defaults to all rules. */
  rules?: RuleId[];
  /** Maximum allowed input length in UTF-16 code units. Defaults to 1_000_000. */
  maxLength?: number;
  /** Maximum allowed DOM nesting depth. Defaults to 256. */
  maxDepth?: number;
}

/**
 * An accessibility issue discovered during auditing.
 */
export interface Finding {
  /** Identifier of the violated rule. */
  rule: RuleId;
  /** Associated WCAG 2.2 criterion, or null for best-practice rules. */
  wcag: string | null;
  /** UTF-16 code unit offset of the start tag. */
  offset: number;
  /** Structural selector path to the element (e.g. 'div[1]>button[2]'). */
  path: string;
  /** Diagnostic message explaining the issue. */
  message: string;
}

/**
 * Complete audit result containing all discovered findings.
 */
export interface AuditResult {
  /** List of detected accessibility findings sorted by offset, then rule. */
  findings: Finding[];
}

/**
 * Error codes emitted by A11yAuditError.
 */
export type A11yAuditErrorCode = "INPUT_TOO_LARGE" | "TOO_DEEP" | "INVALID_OPTIONS";

/**
 * Base error class for accessibility audit operations.
 */
export class A11yAuditError extends Error {
  readonly code: A11yAuditErrorCode;

  constructor(code: A11yAuditErrorCode, message: string) {
    super(message);
    this.name = "A11yAuditError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
