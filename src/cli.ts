import { auditHtml, formatFindings } from "./index.js";
import type { AuditOptions } from "./types.js";

export interface CliIo {
  stdout(s: string): void;
  stderr(s: string): void;
  readFile(path: string): Promise<string>;
}

/**
 * CLI runner for auditing HTML files.
 *
 * Exit codes:
 * - 0: clean (no accessibility findings)
 * - 1: accessibility findings detected
 * - 2: usage error or I/O failure
 */
export async function run(argv: string[], io: CliIo): Promise<number> {
  let format: "text" | "json" = "text";
  let filePath: string | null = null;
  const options: AuditOptions = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--format") {
      const val = argv[i + 1];
      if (val === "json" || val === "text") {
        format = val;
        i++;
      } else {
        io.stderr('error: invalid format option; must be "text" or "json"');
        return 2;
      }
    } else if (arg?.startsWith("--format=")) {
      const val = arg.slice("--format=".length);
      if (val === "json" || val === "text") {
        format = val;
      } else {
        io.stderr('error: invalid format option; must be "text" or "json"');
        return 2;
      }
    } else if (arg?.startsWith("-")) {
      io.stderr(`error: unknown option ${arg}`);
      return 2;
    } else if (arg && filePath === null) {
      filePath = arg;
    } else if (arg) {
      io.stderr("error: unexpected argument");
      return 2;
    }
  }

  if (!filePath) {
    io.stderr("usage: component-a11y-audit <file> [--format text|json]");
    return 2;
  }

  let content: string;
  try {
    content = await io.readFile(filePath);
  } catch (_err) {
    io.stderr(`error: cannot read ${filePath}`);
    return 2;
  }

  try {
    const result = auditHtml(content, options);
    const output = formatFindings(result, format);
    if (output) {
      io.stdout(output);
    }
    return result.findings.length > 0 ? 1 : 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    io.stderr(`error: ${msg}`);
    return 2;
  }
}
