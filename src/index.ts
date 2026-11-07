import { ALL_RULES } from "./constants.js";
import { parseHtml } from "./parser.js";
import { runAudits } from "./rules.js";
import {
  A11yAuditError,
  type AuditOptions,
  type AuditResult,
  type Finding,
  type RuleId,
} from "./types.js";

export { type CliIo, run } from "./cli.js";
export { A11yAuditError, type AuditOptions, type AuditResult, type Finding, type RuleId };

const DEFAULT_MAX_LENGTH = 1_000_000;
const DEFAULT_MAX_DEPTH = 256;
const KNOWN_RULES = new Set<string>(ALL_RULES);

/**
 * Performs static accessibility audit on rendered HTML fragment or document string.
 *
 * @param html - HTML string to audit.
 * @param options - Audit configuration options.
 * @returns AuditResult containing detected findings.
 * @throws {A11yAuditError} If input exceeds bounds or contains invalid options.
 */
export function auditHtml(html: string, options?: AuditOptions): AuditResult {
  const maxLength = options?.maxLength ?? DEFAULT_MAX_LENGTH;
  const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;

  if (maxLength <= 0 || !Number.isFinite(maxLength)) {
    throw new A11yAuditError("INVALID_OPTIONS", "maxLength must be a positive finite integer");
  }
  if (maxDepth <= 0 || !Number.isFinite(maxDepth)) {
    throw new A11yAuditError("INVALID_OPTIONS", "maxDepth must be a positive finite integer");
  }

  let activeRules: Set<RuleId>;
  if (options?.rules) {
    for (const rule of options.rules) {
      if (!KNOWN_RULES.has(rule)) {
        throw new A11yAuditError("INVALID_OPTIONS", `Unknown rule "${rule}"`);
      }
    }
    activeRules = new Set(options.rules);
  } else {
    activeRules = new Set(ALL_RULES);
  }

  const root = parseHtml(html, maxLength, maxDepth);
  const findings = runAudits(root, activeRules);
  return { findings };
}

/**
 * Formats audit findings as human-readable text lines or JSON string.
 *
 * Text format output line template: '<offset> <rule> <path>: <message>'
 *
 * @param result - The audit result to format.
 * @param format - Output format, either 'text' or 'json'.
 */
export function formatFindings(result: AuditResult, format: "text" | "json"): string {
  if (format === "json") {
    return JSON.stringify(result.findings, null, 2);
  }

  return result.findings.map((f) => `${f.offset} ${f.rule} ${f.path}: ${f.message}`).join("\n");
}
