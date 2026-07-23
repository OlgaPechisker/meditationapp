import type { NextFunction, Request, RequestHandler, Response } from "express";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { inspectVerifiedImage, isPublicImageFilename } from "../utils/verified-image.js";

function sendNotFound(res: Response): void {
  res.status(404).end();
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR");
}

export function serveVerifiedLocalUploads(uploadDirectory: string, maxFileSizeBytes: number): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendNotFound(res);
      return;
    }

    const filename = req.path.startsWith("/") ? req.path.slice(1) : req.path;
    if (!filename || filename.includes("/") || filename.includes("\\") || filename.includes("\0")) {
      sendNotFound(res);
      return;
    }

    try {
      const filePath = join(uploadDirectory, filename);
      const fileStats = await stat(filePath);
      if (!fileStats.isFile() || fileStats.size === 0 || fileStats.size > maxFileSizeBytes) {
        sendNotFound(res);
        return;
      }

      const buffer = await readFile(filePath);
      if (buffer.length !== fileStats.size) {
        sendNotFound(res);
        return;
      }

      const image = await inspectVerifiedImage(buffer);
      if (!image || !isPublicImageFilename(filename, image)) {
        sendNotFound(res);
        return;
      }

      res.set({
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": "inline",
        "Content-Length": String(buffer.length),
        "Content-Type": image.contentType,
        "Cross-Origin-Resource-Policy": "same-site",
        "X-Content-Type-Options": "nosniff",
      });

      if (req.method === "HEAD") {
        res.end();
        return;
      }

      res.end(buffer);
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        sendNotFound(res);
        return;
      }
      next(error);
    }
  };
}
