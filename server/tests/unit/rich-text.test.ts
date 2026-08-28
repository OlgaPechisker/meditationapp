import { describe, expect, it } from "vitest";
import { migrateRichText, sanitizeRichText, validateRichText } from "../../src/utils/rich-text.js";

describe("rich text sanitization", () => {
  it("preserves the supported semantic formatting contract", () => {
    expect(sanitizeRichText(
      '<h2 class="ql-align-left">Heading</h2><p class="ql-direction-ltr ql-align-center"><strong>Bold</strong> and <em>italic</em> <a href="https://example.com" target="_blank">link</a></p>',
    )).toBe(
      '<h2 class="ql-align-left">Heading</h2><p class="ql-direction-ltr ql-align-center"><strong>Bold</strong> and <em>italic</em> <a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a></p>',
    );
  });

  it("normalizes Quill 2 bullet and ordered list output", () => {
    expect(sanitizeRichText(
      '<ol><li data-list="bullet">First</li><li data-list="bullet">Second</li><li data-list="ordered">Third</li></ol>',
    )).toBe("<ul><li>First</li><li>Second</li></ul><ol><li>Third</li></ol>");
  });

  it("removes executable markup, unsupported classes, styles, and unsafe links", () => {
    expect(sanitizeRichText(
      '<p class="ql-align-justify evil" style="color:red" onclick="alert(1)">Safe</p><script>alert(1)</script><iframe src="https://evil.example"></iframe><a href="javascript:alert(1)">bad</a>',
    )).toBe("<p>Safe</p><a>bad</a>");
  });

  it("rejects editor-empty documents after sanitization", () => {
    expect(() => validateRichText("<p><br></p>")).toThrow("visible content");
    expect(() => validateRichText("<script>alert(1)</script>")).toThrow("visible content");
  });

  it("migrates plaintext without interpreting markup characters as HTML", () => {
    expect(migrateRichText(`A < B & "quoted" 'text'\nsecond line`))
      .toBe("<p>A &lt; B &amp; \"quoted\" 'text'<br />second line</p>");
  });

  it("is idempotent for canonical HTML", () => {
    const canonical = '<p class="ql-align-left">Already <strong>formatted</strong></p>';
    expect(migrateRichText(canonical)).toBe(canonical);
  });
});
