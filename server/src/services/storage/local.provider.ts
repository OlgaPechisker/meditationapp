import { mkdir, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename } from "node:path";
import { IStorageProvider, StorageUpload } from "./storage.interface.js";
import { isServerOwnedImageFilename } from "../../utils/verified-image.js";

export class LocalStorageProvider implements IStorageProvider {
  constructor(private uploadDir: string, private baseUrl: string) {}

  async upload(buffer: Buffer, file: StorageUpload): Promise<string> {
    if (!isServerOwnedImageFilename(file.filename, file.contentType)) {
      throw new Error("Invalid storage filename");
    }

    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true });
    }
    const dest = join(this.uploadDir, file.filename);
    await writeFile(dest, buffer);
    return `${this.baseUrl}/uploads/${file.filename}`;
  }

  async delete(url: string): Promise<void> {
    const filename = basename(url);
    const filePath = join(this.uploadDir, filename);
    try {
      await unlink(filePath);
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
        return;
      }
      throw error;
    }
  }
}
