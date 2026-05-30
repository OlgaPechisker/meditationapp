import { resolve } from "node:path";
import { IStorageProvider } from "./storage.interface.js";
import { LocalStorageProvider } from "./local.provider.js";
import { uploadConfig } from "../../config.js";

function createStorageProvider(): IStorageProvider {
  const provider = uploadConfig.STORAGE_PROVIDER;

  if (provider === "local") {
    const uploadDir = resolve(uploadConfig.UPLOAD_DIR);
    return new LocalStorageProvider(uploadDir, uploadConfig.BASE_URL);
  }

  // Future: add "s3" | "azure" cases here
  throw new Error(`Unknown STORAGE_PROVIDER: "${provider}". Supported values: "local"`);
}

export const storageProvider: IStorageProvider = createStorageProvider();
