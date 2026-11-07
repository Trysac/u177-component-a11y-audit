import { describe, expect, it } from "vitest";
import { A11yAuditError, auditHtml, formatFindings, run } from "../src/index.js";

describe("Component A11y Audit", () => {
  it('accepts valid images with alt="" (decorative) and flags images without alt (WCAG 1.1.1)', () => {
    const failing = auditHtml('<img src="a.png">');
    expect(failing.findings).toHaveLength(1);
    expect(failing.findings[0]?.rule).toBe("image-alt");
    expect(failing.findings[0]?.wcag).toBe("1.1.1");
    expect(failing.findings[0]?.offset).toBe(0);

    const decorative = auditHtml('<img src="a.png" alt="">');
    expect(decorative.findings).toEqual([]);
  });

  it("evaluates button accessible names via text, aria-label, img alt, or title", () => {
    const failing = auditHtml("<button></button>");
    expect(failing.findings).toEqual([
      expect.objectContaining({
        rule: "button-name",
        wcag: "4.1.2",
      }),
    ]);

    expect(auditHtml('<button aria-label="Close"></button>').findings).toEqual([]);
    expect(auditHtml('<button><img alt="Save"></button>').findings).toEqual([]);
    expect(auditHtml('<button title="Save"></button>').findings).toEqual([]);
  });

  it("evaluates form field labels and link accessible names", () => {
    const unlabelledInput = auditHtml('<input id="e">');
    expect(unlabelledInput.findings).toEqual([
      expect.objectContaining({
        rule: "label",
        wcag: "4.1.2",
      }),
    ]);

    expect(auditHtml('<label for="e">Email</label><input id="e">').findings).toEqual([]);
    expect(auditHtml("<label>Email <input></label>").findings).toEqual([]);
    expect(auditHtml('<input type="hidden">').findings).toEqual([]);

    const linkNoName = auditHtml('<a href="/x"></a>');
    expect(linkNoName.findings).toEqual([
      expect.objectContaining({
        rule: "link-name",
        wcag: "2.4.4",
      }),
    ]);

    expect(auditHtml("<a>text</a>").findings).toEqual([]);
  });

  it("flags duplicate id at offset 14 with wcag null, and checks aria-valid-attr", () => {
    const dup = auditHtml('<p id="x"></p><p id="x"></p>');
    expect(dup.findings).toHaveLength(1);
    expect(dup.findings[0]?.rule).toBe("duplicate-id");
    expect(dup.findings[0]?.offset).toBe(14);
    expect(dup.findings[0]?.wcag).toBeNull();

    const badAria = auditHtml('<div aria-lable="x"></div>');
    expect(badAria.findings).toHaveLength(1);
    expect(badAria.findings[0]?.rule).toBe("aria-valid-attr");
    expect(badAria.findings[0]?.wcag).toBe("4.1.2");
    expect(badAria.findings[0]?.message).toContain("aria-lable");
  });

  it("flags positive tabindex values and checks heading hierarchy jumps", () => {
    const posTabindex = auditHtml('<div tabindex="1"></div>');
    expect(posTabindex.findings).toEqual([
      expect.objectContaining({
        rule: "tabindex",
        wcag: null,
      }),
    ]);

    expect(auditHtml('<div tabindex="0"></div>').findings).toEqual([]);
    expect(auditHtml('<div tabindex="-1"></div>').findings).toEqual([]);

    const skippedHeading = auditHtml("<h1>A</h1><h3>B</h3>");
    expect(skippedHeading.findings).toEqual([
      expect.objectContaining({
        rule: "heading-order",
        wcag: null,
      }),
    ]);

    expect(auditHtml("<h2>A</h2><h3>B</h3>").findings).toEqual([]);
  });

  it("checks aria-hidden-focus and skips raw text in script/comments", () => {
    const hiddenFocus = auditHtml('<div aria-hidden="true"><a href="/x">x</a></div>');
    expect(hiddenFocus.findings).toEqual([
      expect.objectContaining({
        rule: "aria-hidden-focus",
        wcag: "4.1.2",
      }),
    ]);

    const tabIndexNeg = auditHtml('<div aria-hidden="true"><a href="/x" tabindex="-1">x</a></div>');
    expect(tabIndexNeg.findings).toEqual([]);

    expect(auditHtml('<script>"<img>"</script>').findings).toEqual([]);
    expect(auditHtml("<!-- <img> -->").findings).toEqual([]);
  });

  it("enforces input bounds, nesting limits and rule validation", () => {
    const overLimit = "x".repeat(1_000_001);
    expect(() => auditHtml(overLimit)).toThrowError(A11yAuditError);
    try {
      auditHtml(overLimit);
    } catch (e) {
      expect(e).toBeInstanceOf(A11yAuditError);
      expect((e as A11yAuditError).code).toBe("INPUT_TOO_LARGE");
    }

    expect(() => auditHtml("<div>", { maxLength: 0 })).toThrowError(A11yAuditError);
    expect(() => auditHtml("<div>", { maxDepth: 0 })).toThrowError(A11yAuditError);

    const open257 = "<div>".repeat(257);
    try {
      auditHtml(open257);
    } catch (e) {
      expect(e).toBeInstanceOf(A11yAuditError);
      expect((e as A11yAuditError).code).toBe("TOO_DEEP");
    }

    const open256 = "<div>".repeat(256) + "</div>".repeat(256);
    expect(auditHtml(open256).findings).toEqual([]);

    try {
      // @ts-expect-error testing invalid rule
      auditHtml("<div></div>", { rules: ["nope"] });
    } catch (e) {
      expect(e).toBeInstanceOf(A11yAuditError);
      expect((e as A11yAuditError).code).toBe("INVALID_OPTIONS");
    }

    const customRules = auditHtml("<img src='x'>", { rules: ["image-alt"] });
    expect(customRules.findings).toHaveLength(1);
  });

  it("supports aria-labelledby resolution in accname calculation", () => {
    const html =
      '<span id="desc">Submit <span>form</span></span><button aria-labelledby="desc"></button>';
    const result = auditHtml(html);
    expect(result.findings).toEqual([]);

    // missing referenced id in labelledby falls back to descendant/title
    expect(
      auditHtml('<button aria-labelledby="nonexistent" title="hello"></button>').findings,
    ).toEqual([]);
    // button with nested elements
    expect(auditHtml("<button><span>Click <b>Me</b></span></button>").findings).toEqual([]);
    // button with empty label falls back to title
    expect(auditHtml('<button aria-label="   " title="Fallback"></button>').findings).toEqual([]);
  });

  it("handles edge cases: unquoted attributes, uppercase tags, emoji offsets, and CRLF", () => {
    const html =
      "<!DOCTYPE html><?xml version='1.0'?><BUTTON CLASS=btn\r\nID=b1 disabled aria-disabled='true'>\n🎉<IMG SRC=test.png alt='&amp; &lt; &gt; &quot; &#39; &#x41; &#65;'>\r\n</BUTTON>";
    const result = auditHtml(html);
    expect(result.findings).toEqual([]);

    // entity parsing edge cases
    expect(auditHtml('<img src="a" alt="&#xGG; &#99999999999999999999999;">').findings).toEqual([]);

    // unclosed tags, unmatched closing tags, void elements, stray <, raw script unclosed
    const tolerantHtml =
      "<div><p><span>hello</div> stray < text <img src='x' alt='ok'/> <script>var x = 1;</script> <style>body{}</style> <unknown attr=>";
    expect(() => auditHtml(tolerantHtml)).not.toThrow();
    expect(() => auditHtml("<script>unclosed script")).not.toThrow();

    // label wrapping input directly and deeply nested
    expect(auditHtml("<label><span><span>Name <input></span></span></label>").findings).toEqual([]);
    // form elements: select, textarea without label
    expect(auditHtml("<select></select>").findings).toHaveLength(1);
    expect(auditHtml("<textarea></textarea>").findings).toHaveLength(1);
    // aria-label / aria-labelledby on input
    expect(auditHtml('<input aria-label="Name">').findings).toEqual([]);
    expect(auditHtml('<span id="l">Name</span><input aria-labelledby="l">').findings).toEqual([]);

    // aria-hidden-focus with tabindex >= 0, input, textarea, select, disabled
    const hiddenWithTabindex = auditHtml(
      '<div aria-hidden="true"><div tabindex="0">focus me</div></div>',
    );
    expect(hiddenWithTabindex.findings).toHaveLength(1);
    const hiddenWithDisabledBtn = auditHtml(
      '<div aria-hidden="true"><button disabled>disabled</button></div>',
    );
    expect(hiddenWithDisabledBtn.findings).toEqual([]);
    const hiddenWithAriaDisabled = auditHtml(
      '<div aria-hidden="true"><button aria-disabled="true">disabled</button></div>',
    );
    expect(hiddenWithAriaDisabled.findings).toEqual([]);
    const hiddenWithInputs = auditHtml(
      '<div aria-hidden="true"><input><select></select><textarea></textarea></div>',
    );
    // The unlabeled fields also raise 'label' findings; only the aria-hidden ones are counted here.
    expect(hiddenWithInputs.findings.filter((f) => f.rule === "aria-hidden-focus")).toHaveLength(3);

    // sorting findings: same offset different rules or multiple findings
    const multiFindings = auditHtml('<button tabindex="1" aria-lable="x"></button>');
    expect(multiFindings.findings.length).toBeGreaterThan(1);
  });

  it("formats findings in text and json representations", () => {
    const result = auditHtml('<img src="foo.jpg">');
    const text = formatFindings(result, "text");
    expect(text).toBe("0 image-alt img[1]: Image element is missing an alt attribute.");

    const json = formatFindings(result, "json");
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].rule).toBe("image-alt");
  });

  it("runs CLI commands with expected exit codes and output handling", async () => {
    const writtenStdout: string[] = [];
    const writtenStderr: string[] = [];
    const mockIo = {
      stdout: (s: string) => writtenStdout.push(s),
      stderr: (s: string) => writtenStderr.push(s),
      readFile: async (p: string) => {
        if (p === "a.html") return '<img src="bad.png">';
        if (p === "clean.html") return '<img src="ok.png" alt="ok">';
        throw new Error("file not found");
      },
    };

    // Findings detected -> exit 1
    const codeFindings = await run(["a.html", "--format", "json"], mockIo);
    expect(codeFindings).toBe(1);
    const jsonParsed = JSON.parse(writtenStdout[0] ?? "[]");
    expect(jsonParsed).toHaveLength(1);
    expect(jsonParsed[0].rule).toBe("image-alt");

    // Clean file -> exit 0
    writtenStdout.length = 0;
    const codeClean = await run(["clean.html", "--format=text"], mockIo);
    expect(codeClean).toBe(0);
    expect(writtenStdout.join("")).toBe("");

    // Missing file -> exit 2 with specific error message
    writtenStderr.length = 0;
    // (an io whose readFile rejects for every path, as in the acceptance criterion)
    const rejectingIo = {
      ...mockIo,
      readFile: async (_p: string): Promise<string> => Promise.reject(new Error("EIO")),
    };
    const codeMissing = await run(["a.html"], rejectingIo);
    expect(codeMissing).toBe(2);
    expect(writtenStderr[0]).toBe("error: cannot read a.html");

    // Invalid CLI options -> exit 2
    writtenStderr.length = 0;
    expect(await run(["--format", "invalid", "file.html"], mockIo)).toBe(2);
    expect(await run(["--format=invalid", "file.html"], mockIo)).toBe(2);
    expect(await run(["--unknown"], mockIo)).toBe(2);
    expect(await run([], mockIo)).toBe(2);
    expect(await run(["file1.html", "extra.html"], mockIo)).toBe(2);

    // Audit throwing error during CLI run
    const throwIo = {
      ...mockIo,
      readFile: async () => "x".repeat(1_000_001),
    };
    writtenStderr.length = 0;
    expect(await run(["huge.html"], throwIo)).toBe(2);
    expect(writtenStderr[0]).toContain("error: Input length");
  });
});
