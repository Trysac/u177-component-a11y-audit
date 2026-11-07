import { computeAccessibleName } from "./accname.js";
import { VALID_ARIA_ATTRIBUTES, WCAG_MAP } from "./constants.js";
import type { ElementNode } from "./parser.js";
import type { Finding, RuleId } from "./types.js";

function isElementDisabled(node: ElementNode): boolean {
  if (node.attributes.has("disabled")) return true;
  const ariaDisabled = node.attributes.get("aria-disabled");
  if (ariaDisabled === "true") return true;
  return false;
}

/**
 * Collects all element nodes in pre-order traversal.
 */
export function collectAllElements(root: ElementNode): ElementNode[] {
  const results: ElementNode[] = [];
  function walk(node: ElementNode) {
    for (const child of node.children) {
      if (child.tag !== "#text") {
        const elChild = child as ElementNode;
        results.push(elChild);
        walk(elChild);
      }
    }
  }
  walk(root);
  return results;
}

/**
 * Checks if an element is contained inside a `<label>` element.
 */
function isInsideLabel(node: ElementNode): boolean {
  let cur: ElementNode | null = node.parent;
  while (cur && cur.tag !== "#root") {
    if (cur.tag === "label") return true;
    cur = cur.parent;
  }
  return false;
}

export function runAudits(root: ElementNode, activeRules: Set<RuleId>): Finding[] {
  const findings: Finding[] = [];
  const allElements = collectAllElements(root);

  // Build id mapping for quick lookups
  const idMap = new Map<string, ElementNode>();
  for (const el of allElements) {
    const id = el.attributes.get("id");
    if (id && !idMap.has(id)) {
      idMap.set(id, el);
    }
  }

  // Collect label[for] references
  const labeledIds = new Set<string>();
  for (const el of allElements) {
    if (el.tag === "label") {
      const forAttr = el.attributes.get("for");
      if (forAttr) {
        labeledIds.add(forAttr.trim());
      }
    }
  }

  // Duplicate ID detection
  if (activeRules.has("duplicate-id")) {
    const seenIds = new Set<string>();
    for (const el of allElements) {
      const id = el.attributes.get("id");
      if (id !== undefined && id.trim() !== "") {
        const trimmedId = id.trim();
        if (seenIds.has(trimmedId)) {
          findings.push({
            rule: "duplicate-id",
            wcag: WCAG_MAP["duplicate-id"],
            offset: el.offset,
            path: el.path,
            message: `Duplicate id attribute value "${trimmedId}" found.`,
          });
        } else {
          seenIds.add(trimmedId);
        }
      }
    }
  }

  // Heading order check
  if (activeRules.has("heading-order")) {
    let prevLevel: number | null = null;
    for (const el of allElements) {
      const match = /^h([1-6])$/.exec(el.tag);
      if (match?.[1]) {
        const level = Number.parseInt(match[1], 10);
        if (prevLevel !== null && level > prevLevel + 1) {
          findings.push({
            rule: "heading-order",
            wcag: WCAG_MAP["heading-order"],
            offset: el.offset,
            path: el.path,
            message: `Heading level ${level} skipped levels from ${prevLevel}.`,
          });
        }
        prevLevel = level;
      }
    }
  }

  // Element-level rule evaluations
  for (const el of allElements) {
    // 1. image-alt
    if (activeRules.has("image-alt") && el.tag === "img") {
      if (!el.attributes.has("alt")) {
        findings.push({
          rule: "image-alt",
          wcag: WCAG_MAP["image-alt"],
          offset: el.offset,
          path: el.path,
          message: "Image element is missing an alt attribute.",
        });
      }
    }

    // 2. button-name
    if (activeRules.has("button-name") && el.tag === "button") {
      const name = computeAccessibleName(el, idMap);
      if (!name) {
        findings.push({
          rule: "button-name",
          wcag: WCAG_MAP["button-name"],
          offset: el.offset,
          path: el.path,
          message: "Button element must have a discernible accessible name.",
        });
      }
    }

    // 3. link-name
    if (activeRules.has("link-name") && el.tag === "a" && el.attributes.has("href")) {
      const name = computeAccessibleName(el, idMap);
      if (!name) {
        findings.push({
          rule: "link-name",
          wcag: WCAG_MAP["link-name"],
          offset: el.offset,
          path: el.path,
          message: "Anchor link with href must have a discernible accessible name.",
        });
      }
    }

    // 4. label rule for form elements
    if (activeRules.has("label")) {
      const isTargetInput =
        el.tag === "input" &&
        !["hidden", "submit", "button", "reset", "image"].includes(
          (el.attributes.get("type") ?? "text").toLowerCase(),
        );
      const isTargetElement = isTargetInput || el.tag === "select" || el.tag === "textarea";

      if (isTargetElement) {
        const hasWrappingLabel = isInsideLabel(el);
        const id = el.attributes.get("id");
        const hasReferencingLabel = Boolean(id && labeledIds.has(id.trim()));
        const ariaLabel = el.attributes.get("aria-label");
        const ariaLabelledby = el.attributes.get("aria-labelledby");
        const hasAriaName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());

        if (!hasWrappingLabel && !hasReferencingLabel && !hasAriaName) {
          findings.push({
            rule: "label",
            wcag: WCAG_MAP.label,
            offset: el.offset,
            path: el.path,
            message: `Form field <${el.tag}> must have an associated label or accessible name.`,
          });
        }
      }
    }

    // 5. aria-valid-attr
    if (activeRules.has("aria-valid-attr")) {
      for (const attr of el.attributes.keys()) {
        if (attr.startsWith("aria-") && !VALID_ARIA_ATTRIBUTES.has(attr)) {
          findings.push({
            rule: "aria-valid-attr",
            wcag: WCAG_MAP["aria-valid-attr"],
            offset: el.offset,
            path: el.path,
            message: `Invalid ARIA attribute "${attr}" on <${el.tag}>.`,
          });
        }
      }
    }

    // 6. tabindex
    if (activeRules.has("tabindex") && el.attributes.has("tabindex")) {
      const raw = el.attributes.get("tabindex")?.trim() ?? "";
      const val = Number.parseInt(raw, 10);
      if (Number.isFinite(val) && val > 0) {
        findings.push({
          rule: "tabindex",
          wcag: WCAG_MAP.tabindex,
          offset: el.offset,
          path: el.path,
          message: `Avoid positive tabindex values (${val}); use 0 or -1 instead.`,
        });
      }
    }

    // 7. aria-hidden-focus
    if (activeRules.has("aria-hidden-focus") && el.attributes.get("aria-hidden") === "true") {
      // Check descendants for interactive/focusable elements
      const descendants = collectAllElements(el);
      for (const desc of descendants) {
        const descTabindex = desc.attributes.get("tabindex");
        if (descTabindex === "-1") {
          continue;
        }
        let isFocusable = false;
        if (descTabindex !== undefined) {
          const parsed = Number.parseInt(descTabindex.trim(), 10);
          if (Number.isFinite(parsed) && parsed >= 0) {
            isFocusable = true;
          }
        }
        if (!isFocusable && !isElementDisabled(desc)) {
          if (desc.tag === "a" && desc.attributes.has("href")) {
            isFocusable = true;
          } else if (
            ["button", "input", "select", "textarea"].includes(desc.tag) &&
            (desc.tag !== "input" || desc.attributes.get("type")?.toLowerCase() !== "hidden")
          ) {
            isFocusable = true;
          }
        }
        if (isFocusable) {
          findings.push({
            rule: "aria-hidden-focus",
            wcag: WCAG_MAP["aria-hidden-focus"],
            offset: desc.offset,
            path: desc.path,
            message: `Focusable element <${desc.tag}> is contained inside an aria-hidden="true" container.`,
          });
        }
      }
    }
  }

  // Sort findings by offset, then rule identifier
  findings.sort((a, b) => {
    if (a.offset !== b.offset) return a.offset - b.offset;
    return a.rule.localeCompare(b.rule);
  });

  return findings;
}
