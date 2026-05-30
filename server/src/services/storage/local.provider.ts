import { mkdir, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename } from "node:path";
import { IStorageProvider } from "./storage.interface.js";

export class LocalStorageProvider implements IStorageProvider {
  constructor(private uploadDir: string, private baseUrl: string) {}

  async upload(buffer: Buffer, filename: string, _mimetype: string): Promise<string> {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true });
    }
    const dest = join(this.uploadDir, filename);
    await writeFile(dest, buffer);
    return `${this.baseUrl}/uploads/${filename}`;
  }

  async delete(url: string): Promise<void> {
    const filename = basename(url);
    const filePath = join(this.uploadDir, filename);
    try {
      await unlink(filePath);
    } catch {
      // file already gone — no-op
    }
  }
}
