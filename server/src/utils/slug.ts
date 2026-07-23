import { MAX_SLUG_LENGTH } from "./content-contracts.js";

/**
 * Generates a URL-safe slug from arbitrary (including Hebrew/Unicode) text.
 *
 * Latin text is lowercased and hyphen-joined. Non-Latin scripts such as Hebrew
 * are preserved as-is (URLs may contain percent-encoded Unicode), so a Hebrew
 * title yields a readable Hebrew slug instead of collapsing to a bare timestamp.
 * A short random suffix reduces collisions; the database constraint guarantees
 * uniqueness when the slug is persisted.
 */
export function generateSlug(title: string): string {
  const base = title
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    // Collapse any run of characters that are not letters/numbers into a hyphen.
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = Math.random().toString(36).slice(2, 8);
  const suffixWithSeparator = `-${suffix}`;
  return base
    ? `${base.slice(0, MAX_SLUG_LENGTH - suffixWithSeparator.length)}${suffixWithSeparator}`
    : `lecture-${suffix}`;
}
