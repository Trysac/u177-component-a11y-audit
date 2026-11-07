import type { ElementNode, TextNode } from "./parser.js";

/**
 * Recursively gathers accessible text content of an element without reference cycles.
 */
export function getAccessibleSubtreeText(element: ElementNode, visited: Set<ElementNode>): string {
  if (visited.has(element)) return "";
  visited.add(element);

  const parts: string[] = [];
  for (const child of element.children) {
    if (child.tag === "#text") {
      const trimmed = (child as TextNode).text.trim();
      if (trimmed) parts.push(trimmed);
    } else if (child.tag === "img") {
      const alt = child.attributes.get("alt")?.trim();
      if (alt) parts.push(alt);
    } else {
      const text = getAccessibleSubtreeText(child as ElementNode, visited);
      if (text) parts.push(text);
    }
  }
  return parts.join(" ").trim();
}

/**
 * Computes accessible name according to the accname 1.2 subset:
 * 1. aria-labelledby (referencing element IDs in the fragment)
 * 2. aria-label (non-blank)
 * 3. descendant text content (including img alt attributes)
 * 4. title attribute
 */
export function computeAccessibleName(
  element: ElementNode,
  idMap: Map<string, ElementNode>,
): string {
  // 1. aria-labelledby
  const labelledBy = element.attributes.get("aria-labelledby");
  if (labelledBy !== undefined) {
    const ids = labelledBy.trim().split(/\s+/).filter(Boolean);
    const texts: string[] = [];
    for (const id of ids) {
      const target = idMap.get(id);
      if (target) {
        const text = getAccessibleSubtreeText(target, new Set());
        if (text) texts.push(text);
      }
    }
    if (texts.length > 0) {
      return texts.join(" ").trim();
    }
  }

  // 2. aria-label
  const ariaLabel = element.attributes.get("aria-label");
  if (ariaLabel !== undefined && ariaLabel.trim() !== "") {
    return ariaLabel.trim();
  }

  // 3. Descendant text
  const descendantText = getAccessibleSubtreeText(element, new Set());
  if (descendantText !== "") {
    return descendantText;
  }

  // 4. title attribute
  const title = element.attributes.get("title");
  if (title !== undefined && title.trim() !== "") {
    return title.trim();
  }

  return "";
}
