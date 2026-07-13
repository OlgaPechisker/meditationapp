import { z } from "zod";

const YOUTUBE_HOST = /^(?:www\.)?(?:youtube\.com|youtu\.be)$/i;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const EMBED_PATH = /^\/(?:embed|shorts)\/([^/?#]+)\/?$/;

/**
 * Returns true when `value` is a YouTube URL from which an 11-char video id can
 * be extracted (`watch?v=`, `youtu.be/<id>`, `/embed/<id>`, `/shorts/<id>`).
 *
 * Rejects trailing path segments after the id (e.g. `youtu.be/<id>/extra`) so
 * the accepted set stays aligned with the frontend's extractor — a URL that
 * saves here must also render there.
 */
export function isYouTubeUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.hash) return false;
  if (!YOUTUBE_HOST.test(url.hostname)) return false;

  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.slice(1).replace(/\/$/, "") || null;
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v");
  } else {
    id = EMBED_PATH.exec(url.pathname)?.[1] ?? null;
  }

  return !!id && VIDEO_ID.test(id);
}

export const youTubeUrlSchema = z
  .string()
  .url()
  .refine(isYouTubeUrl, "Must be a valid YouTube URL");
