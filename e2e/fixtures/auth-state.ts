import fs from 'fs';
import path from 'path';

export const STORAGE_STATE = path.join(__dirname, '..', '.auth', 'admin.json');

interface StorageState {
  origins?: Array<{
    localStorage?: Array<{
      name?: string;
      value?: string;
    }>;
  }>;
}

export function readAdminToken(): string {
  let storageState: StorageState;

  try {
    storageState = JSON.parse(fs.readFileSync(STORAGE_STATE, 'utf8')) as StorageState;
  } catch (error) {
    throw new Error(
      `Unable to read E2E authentication state at ${STORAGE_STATE}. Global setup must complete before tests run.`,
      { cause: error },
    );
  }

  for (const origin of storageState.origins ?? []) {
    const token = origin.localStorage?.find((item) => item.name === 'einat_token')?.value;
    if (token) {
      return token;
    }
  }

  throw new Error(`E2E authentication state at ${STORAGE_STATE} does not contain an admin token.`);
}
