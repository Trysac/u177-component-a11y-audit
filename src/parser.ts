import { VOID_TAGS } from "./constants.js";
import { A11yAuditError } from "./types.js";

export interface ElementNode {
  tag: string;
  offset: number;
  attributes: Map<string, string>;
  children: AstNode[];
  parent: ElementNode | null;
  path: string;
}

export interface TextNode {
  tag: "#text";
  text: string;
  offset: number;
  parent: ElementNode | null;
}

export type AstNode = ElementNode | TextNode;

/**
 * Decodes basic HTML entities and numeric references in attribute values.
 */
export function decodeEntities(input: string): string {
  return input.replace(/&(amp|lt|gt|quot|#39|#x[0-9a-fA-F]+|#[0-9]+);/g, (entity, code: string) => {
    switch (code) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return '"';
      case "#39":
        return "'";
      default:
        if (code.startsWith("#x") || code.startsWith("#X")) {
          const hex = Number.parseInt(code.slice(2), 16);
          if (Number.isFinite(hex) && hex >= 0 && hex <= 0x10ffff) {
            try {
              return String.fromCodePoint(hex);
            } catch {
              return entity;
            }
          }
          return entity;
        }
        if (code.startsWith("#")) {
          const dec = Number.parseInt(code.slice(1), 10);
          if (Number.isFinite(dec) && dec >= 0 && dec <= 0x10ffff) {
            try {
              return String.fromCodePoint(dec);
            } catch {
              return entity;
            }
          }
          return entity;
        }
        return entity;
    }
  });
}

/**
 * Parses an HTML string into an AST with size and depth limits.
 */
export function parseHtml(html: string, maxLength: number, maxDepth: number): ElementNode {
  if (html.length > maxLength) {
    throw new A11yAuditError(
      "INPUT_TOO_LARGE",
      `Input length (${html.length}) exceeds maximum allowed length of ${maxLength}.`,
    );
  }

  const root: ElementNode = {
    tag: "#root",
    offset: 0,
    attributes: new Map(),
    children: [],
    parent: null,
    path: "",
  };

  let current: ElementNode = root;
  let depth = 0;
  let i = 0;
  const len = html.length;

  // Tracks sibling element counts per parent to build structural paths like 'div[1]>button[2]'
  const siblingCounters = new Map<ElementNode, Map<string, number>>();

  function getSiblingIndex(parent: ElementNode, tag: string): number {
    let counter = siblingCounters.get(parent);
    if (!counter) {
      counter = new Map();
      siblingCounters.set(parent, counter);
    }
    const next = (counter.get(tag) ?? 0) + 1;
    counter.set(tag, next);
    return next;
  }

  while (i < len) {
    if (html[i] === "<") {
      // Comment: <!-- ... -->
      if (html.startsWith("<!--", i)) {
        const end = html.indexOf("-->", i + 4);
        i = end === -1 ? len : end + 3;
        continue;
      }

      // DOCTYPE or processing instruction: <! ... > or <? ... ?>
      if (html.startsWith("<!", i) || html.startsWith("<?", i)) {
        const end = html.indexOf(">", i + 2);
        i = end === -1 ? len : end + 1;
        continue;
      }

      // End tag: </tag>
      if (i + 1 < len && html[i + 1] === "/") {
        const end = html.indexOf(">", i + 2);
        const raw = end === -1 ? html.slice(i + 2) : html.slice(i + 2, end);
        const tagMatch = /^[a-zA-Z0-9:-]+/.exec(raw.trim());
        const endTag = tagMatch ? tagMatch[0].toLowerCase() : "";
        i = end === -1 ? len : end + 1;

        if (endTag) {
          // Search ancestor chain for matching start tag (tolerant)
          let target: ElementNode | null = current;
          while (target && target !== root && target.tag !== endTag) {
            target = target.parent;
          }
          if (target && target !== root) {
            // Unwind to matched ancestor
            let unwind: ElementNode | null = current;
            while (unwind && unwind !== target) {
              depth = Math.max(0, depth - 1);
              unwind = unwind.parent;
            }
            depth = Math.max(0, depth - 1);
            current = target.parent ?? root;
          }
        }
        continue;
      }

      // Start tag: <tag ...>
      const tagMatch = /^<([a-zA-Z0-9:-]+)/.exec(html.slice(i));
      if (tagMatch?.[1]) {
        const tagOffset = i;
        const tag = tagMatch[1].toLowerCase();
        let cursor = i + tagMatch[0].length;
        const attributes = new Map<string, string>();

        while (cursor < len) {
          // Skip whitespace
          while (cursor < len && /\s/.test(html[cursor] ?? "")) {
            cursor++;
          }
          if (cursor >= len) break;
          if (html[cursor] === ">") {
            cursor++;
            break;
          }
          if (html[cursor] === "/" && cursor + 1 < len && html[cursor + 1] === ">") {
            cursor += 2;
            break;
          }

          // Attribute name
          const attrNameMatch = /^[^\s"'>/=]+/.exec(html.slice(cursor));
          if (!attrNameMatch) {
            cursor++;
            continue;
          }
          const attrName = attrNameMatch[0].toLowerCase();
          cursor += attrNameMatch[0].length;

          // Whitespace before '='
          while (cursor < len && /\s/.test(html[cursor] ?? "")) {
            cursor++;
          }

          let attrValue = "";
          if (cursor < len && html[cursor] === "=") {
            cursor++;
            while (cursor < len && /\s/.test(html[cursor] ?? "")) {
              cursor++;
            }
            if (cursor < len) {
              const quote = html[cursor];
              if (quote === '"' || quote === "'") {
                cursor++;
                const valueStart = cursor;
                while (cursor < len && html[cursor] !== quote) {
                  cursor++;
                }
                attrValue = decodeEntities(html.slice(valueStart, cursor));
                if (cursor < len && html[cursor] === quote) {
                  cursor++;
                }
              } else {
                // Unquoted attribute value
                const valMatch = /^[^\s>]+/.exec(html.slice(cursor));
                if (valMatch) {
                  attrValue = decodeEntities(valMatch[0]);
                  cursor += valMatch[0].length;
                }
              }
            }
          }
          if (!attributes.has(attrName)) {
            attributes.set(attrName, attrValue);
          }
        }

        i = cursor;

        const siblingIndex = getSiblingIndex(current, tag);
        const step = `${tag}[${siblingIndex}]`;
        const path = current.path ? `${current.path}>${step}` : step;

        const element: ElementNode = {
          tag,
          offset: tagOffset,
          attributes,
          children: [],
          parent: current,
          path,
        };

        current.children.push(element);

        // Raw text elements: script, style
        if (tag === "script" || tag === "style") {
          const closeTag = `</${tag}>`;
          const lower = html.toLowerCase();
          const closeIndex = lower.indexOf(closeTag, i);
          if (closeIndex === -1) {
            i = len;
          } else {
            i = closeIndex + closeTag.length;
          }
          continue;
        }

        // Void elements are self-closing; they do not increase nesting depth
        if (!VOID_TAGS.has(tag)) {
          depth++;
          if (depth > maxDepth) {
            throw new A11yAuditError(
              "TOO_DEEP",
              `Nesting depth (${depth}) exceeded maximum allowed depth of ${maxDepth}.`,
            );
          }
          current = element;
        }
        continue;
      }

      // Stray '<' treated as text
      const textStart = i;
      i++;
      while (i < len && html[i] !== "<") {
        i++;
      }
      const text = html.slice(textStart, i);
      current.children.push({
        tag: "#text",
        text,
        offset: textStart,
        parent: current,
      });
      continue;
    }

    // Text node
    const textStart = i;
    while (i < len && html[i] !== "<") {
      i++;
    }
    const text = html.slice(textStart, i);
    current.children.push({
      tag: "#text",
      text,
      offset: textStart,
      parent: current,
    });
  }

  return root;
}
