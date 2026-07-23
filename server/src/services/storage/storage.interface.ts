import type { VerifiedImageContentType } from "../../utils/verified-image.js";

export interface StorageUpload {
  filename: string;
  contentType: VerifiedImageContentType;
}

export interface IStorageProvider {
  /**
   * Persist a file and return its publicly accessible URL.
   */
  upload(buffer: Buffer, file: StorageUpload): Promise<string>;

  /**
   * Remove a previously uploaded file by its public URL.
   * Implementations should silently ignore unknown URLs.
   */
  delete(url: string): Promise<void>;
}
