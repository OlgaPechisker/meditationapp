export interface IStorageProvider {
  /**
   * Persist a file and return its publicly accessible URL.
   */
  upload(buffer: Buffer, filename: string, mimetype: string): Promise<string>;

  /**
   * Remove a previously uploaded file by its public URL.
   * Implementations should silently ignore unknown URLs.
   */
  delete(url: string): Promise<void>;
}
