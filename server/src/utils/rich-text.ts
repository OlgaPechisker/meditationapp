import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { ValidationError } from "../errors/application-error.js";

const MAX_RICH_TEXT_LENGTH = 100_000;
const allowedClasses = [
  "ql-align-right",
  "ql-align-center",
  "ql-align-left",
  "ql-direction-rtl",
  "ql-direction-ltr",
];
const supportedBlockTag = /<(?:p|h2|h3|ul|ol|li|br)\b/i;

function normalizeQuillLists(html: string): string {
  return html.replace(/<(ol|ul)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_match, _tag, contents: string) => {
    const items = [...contents.matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/gi)].map((item) => {
      const listType = /\bdata-list\s*=\s*(["'])(bullet|ordered)\1/i.exec(item[1])?.[2];
      return { type: listType === "bullet" ? "ul" : listType === "ordered" ? "ol" : undefined, content: item[2] };
    });

    if (items.length === 0 || items.some((item) => !item.type)) {
      return _match;
    }

    const groups: string[] = [];
    for (const item of items) {
      const previous = groups.at(-1);
      if (previous?.startsWith(`<${item.type}>`)) {
        groups[groups.length - 1] = previous.replace(`</${item.type}>`, `<li>${item.content}</li></${item.type}>`);
      } else {
        groups.push(`<${item.type}><li>${item.content}</li></${item.type}>`);
      }
    }
    return groups.join("");
  });
}

function isMeaningful(html: string): boolean {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;|\u00a0/g, "")
    .trim().length > 0;
}

/**
 * Converts Quill's editor-specific HTML to the small semantic HTML contract
 * that public pages render. Call this for rich-text API input only.
 */
export function sanitizeRichText(value: string): string {
  const normalized = normalizeQuillLists(value);
  const sanitized = sanitizeHtml(normalized, {
    allowedTags: ["p", "br", "h2", "h3", "strong", "em", "ul", "ol", "li", "a"],
    allowedAttributes: {
      p: ["class"],
      h2: ["class"],
      h3: ["class"],
      ul: ["class"],
      ol: ["class"],
      li: ["class"],
      a: ["href", "target", "rel"],
    },
    allowedClasses: {
      p: allowedClasses,
      h2: allowedClasses,
      h3: allowedClasses,
      ul: allowedClasses,
      ol: allowedClasses,
      li: allowedClasses,
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      a: (_tagName, attribs) => {
        const href = attribs.href;
        if (!href || !/^(?:https?:|mailto:|\/|#)/i.test(href)) {
          const safeAttributes: Record<string, string> = {};
          return { tagName: "a", attribs: safeAttributes };
        }

        if (attribs.target === "_blank") {
          const safeAttributes: Record<string, string> = { href, target: "_blank", rel: "noopener noreferrer" };
          return { tagName: "a", attribs: safeAttributes };
        }

        const safeAttributes: Record<string, string> = { href };
        return { tagName: "a", attribs: safeAttributes };
      },
    },
  }).trim();

  return /<\/?(?:p|br|h2|h3|strong|em|ul|ol|li|a)\b/i.test(sanitized)
    ? sanitized
    : sanitized ? `<p>${sanitized}</p>` : "";
}

export function validateRichText(value: string): string {
  if (value.length > MAX_RICH_TEXT_LENGTH) {
    throw new ValidationError(`Rich text must not exceed ${MAX_RICH_TEXT_LENGTH} characters`);
  }

  const sanitized = sanitizeRichText(value);
  if (!isMeaningful(sanitized)) {
    throw new ValidationError("Rich text must contain visible content");
  }
  return sanitized;
}

export const richTextSchema = z.string().max(MAX_RICH_TEXT_LENGTH).transform((value, ctx) => {
  try {
    return validateRichText(value);
  } catch (error) {
    ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Invalid rich text" });
    return z.NEVER;
  }
});

/**
 * Converts legacy plaintext to safe semantic HTML before applying the same
 * sanitizer used for newly authored content.
 */
export function migrateRichText(value: string): string {
  if (supportedBlockTag.test(value)) {
    return sanitizeRichText(value);
  }

  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const paragraphs = escaped
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.replace(/\r?\n/g, "<br>"))
    .filter((paragraph) => paragraph.trim().length > 0)
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("");

  return sanitizeRichText(paragraphs);
}
