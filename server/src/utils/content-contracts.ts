import { z } from "zod";

export const MAX_SLUG_LENGTH = 200;
export const MAX_URL_LENGTH = 2_048;

type PlainTextOptions = {
  minLength?: number;
  trim?: boolean;
  allowNewlines?: boolean;
  allowTabs?: boolean;
};

function hasDisallowedControlCharacter(
  value: string,
  { allowNewlines = false, allowTabs = false }: PlainTextOptions,
): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint !== undefined &&
      ((codePoint <= 0x1f && !(allowTabs && codePoint === 0x09) &&
        !(allowNewlines && (codePoint === 0x0a || codePoint === 0x0d))) ||
        (codePoint >= 0x7f && codePoint <= 0x9f))
    ) {
      return true;
    }
  }
  return false;
}

export function boundedPlainTextSchema(
  maximumLength: number,
  options: PlainTextOptions = {},
) {
  const { minLength = 1, trim = false } = options;
  let schema = z.string();
  if (trim) schema = schema.trim();

  return schema
    .min(minLength)
    .max(maximumLength)
    .refine((value) => !hasDisallowedControlCharacter(value, options), {
      message: "Must not contain control characters",
    });
}

export const slugSchema = boundedPlainTextSchema(MAX_SLUG_LENGTH);

export const localeSchema = boundedPlainTextSchema(35, { trim: true }).regex(
  /^[A-Za-z0-9-]+$/,
  "Must be a language tag",
);

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

export const httpUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_URL_LENGTH)
  .url()
  .refine(isSafeHttpUrl, "Must be an HTTP(S) URL");

function decodePathSegment(segment: string): string | undefined {
  let decoded = segment;
  try {
    while (true) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) return decoded;
      decoded = next;
    }
  } catch {
    return undefined;
  }
}

/**
 * Local asset values are stored as literal root-relative paths. Decode each
 * segment so encoded traversal and separator characters cannot bypass checks.
 */
function isSafeLocalAssetPath(value: string): boolean {
  if (
    (!value.startsWith("/assets/") && !value.startsWith("/uploads/")) ||
    value.includes("\\") ||
    value.includes("?") ||
    value.includes("#")
  ) {
    return false;
  }

  return value.split("/").slice(2).every((segment) => {
    const decoded = decodePathSegment(segment);
    return !!decoded &&
      decoded !== "." &&
      decoded !== ".." &&
      !hasDisallowedControlCharacter(decoded, {}) &&
      !decoded.includes("/") &&
      !decoded.includes("\\") &&
      !decoded.includes("?") &&
      !decoded.includes("#");
  });
}

const localAssetPathSchema = boundedPlainTextSchema(MAX_URL_LENGTH, { trim: true }).refine(
  isSafeLocalAssetPath,
  "Must be an approved local asset path without traversal segments",
);

export const siteAssetUrlSchema = z.union([httpUrlSchema, localAssetPathSchema]);
