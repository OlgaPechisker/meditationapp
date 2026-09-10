import { mkdir, readdir, rmdir, unlink, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/index.js";
import { uploadConfig } from "../src/config.js";
import { clearRateLimitStore } from "../src/middleware/rate-limit.js";
import { LocalStorageProvider } from "../src/services/storage/local.provider.js";
import { inspectVerifiedImage } from "../src/utils/verified-image.js";

const uploadDirectory = resolve(uploadConfig.UPLOAD_DIR);
const createdFiles = new Set<string>();
let token = "";

function auth() {
  return { Authorization: `Bearer ${token}` };
}

function pngChunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, Buffer.from(type), data, Buffer.alloc(4)]);
}

function validPng() {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 0, 0, 0, 0])),
    pngChunk("IDAT", Buffer.from([0])),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const verifiedImages = [
  {
    name: "jpeg",
    contentType: "image/jpeg",
    buffer: Buffer.from([
      0xff, 0xd8,
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00, 0x01, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
      0xff, 0xda, 0x00, 0x02,
      0xff, 0xd9,
    ]),
    extension: "jpg",
  },
  {
    name: "png",
    contentType: "image/png",
    buffer: validPng(),
    extension: "png",
  },
  {
    name: "webp",
    contentType: "image/webp",
    buffer: Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x0c, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
      0x00, 0x00, 0x00, 0x00,
    ]),
    extension: "webp",
  },
  {
    name: "gif",
    contentType: "image/gif",
    buffer: Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64"),
    extension: "gif",
  },
] as const;

async function directoryEntries() {
  return (await readdir(uploadDirectory)).sort();
}

async function expectRejectedUpload(
  buffer: Buffer,
  contentType: string,
  filename: string,
  expectedStatus = 400,
) {
  const before = await directoryEntries();
  const response = await request(app)
    .post("/api/upload")
    .set(auth())
    .attach("file", buffer, { filename, contentType });
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toMatchObject({
    code: expectedStatus === 413 ? "PAYLOAD_TOO_LARGE" : "VALIDATION_ERROR",
  });
  expect(await directoryEntries()).toEqual(before);
}

beforeAll(async () => {
  await mkdir(uploadDirectory, { recursive: true });
  clearRateLimitStore();
  const response = await request(app).post("/api/auth/login").send({ password: "test-password" });
  expect(response.status).toBe(200);
  token = response.body.token;
});

beforeEach(() => {
  clearRateLimitStore();
});

afterAll(async () => {
  clearRateLimitStore();
  await Promise.all([...createdFiles].map(async (filename) => {
    await unlink(resolve(uploadDirectory, filename)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }));
});

describe("verified uploads", () => {
  it.each(verifiedImages)("accepts and serves a verified $name image", async (image) => {
    await expect(inspectVerifiedImage(image.buffer)).resolves.toEqual({
      contentType: image.contentType,
      extension: image.extension,
    });

    const response = await request(app)
      .post("/api/upload")
      .set(auth())
      .attach("file", image.buffer, {
        filename: `../../manipulated.${image.name === "png" ? "jpg" : image.extension}`,
        contentType: image.contentType,
      });
    expect(response.status).toBe(201);

    const filename = basename(new URL(response.body.url).pathname);
    createdFiles.add(filename);
    expect(filename).toMatch(new RegExp(`^[0-9a-f-]+\\.${image.extension}$`));

    const served = await request(app).get(`/uploads/${filename}`);
    expect(served.status).toBe(200);
    expect(served.headers).toMatchObject({
      "cache-control": "public, max-age=31536000, immutable",
      "content-disposition": "inline",
      "content-type": image.contentType,
      "cross-origin-resource-policy": "cross-origin",
      "x-content-type-options": "nosniff",
    });
    expect(Buffer.from(served.body)).toEqual(image.buffer);
  });

  it("rejects malformed, spoofed, oversized, and empty uploads without writing a file", async () => {
    await expectRejectedUpload(Buffer.from("<html><body>not an image</body></html>"), "text/html", "payload.html");
    await expectRejectedUpload(Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"), "image/svg+xml", "payload.svg");
    await expectRejectedUpload(Buffer.alloc(0), "image/png", "empty.png");
    await expectRejectedUpload(Buffer.from([0x89, 0x50, 0x4e, 0x47]), "image/png", "truncated.png");
    await expectRejectedUpload(validPng(), "image/jpeg", "spoofed.jpg");
    await expectRejectedUpload(Buffer.alloc(uploadConfig.MAX_FILE_SIZE_BYTES + 1, 0), "image/png", "oversized.png", 413);
  });

  it("does not serve stale unsafe files and rejects unsafe storage names", async () => {
    const staleFilename = "stale-unsafe.jpg";
    const stalePath = resolve(uploadDirectory, staleFilename);
    await writeFile(stalePath, Buffer.from("<script>unsafe</script>"));
    createdFiles.add(staleFilename);

    const stale = await request(app).get(`/uploads/${staleFilename}`);
    expect(stale.status).toBe(404);

    const provider = new LocalStorageProvider(uploadDirectory, "http://localhost:3000");
    await expect(provider.upload(validPng(), {
      filename: "../../outside.png",
      contentType: "image/png",
    })).rejects.toThrow("Invalid storage filename");
  });

  it("makes missing deletes idempotent while propagating real local I/O failures", async () => {
    const provider = new LocalStorageProvider(uploadDirectory, "http://localhost:3000");
    await expect(provider.delete("http://localhost:3000/uploads/missing-file.png")).resolves.toBeUndefined();

    const directoryName = "cannot-unlink-directory";
    const directoryPath = resolve(uploadDirectory, directoryName);
    await mkdir(directoryPath, { recursive: true });
    try {
      await expect(provider.delete(`http://localhost:3000/uploads/${directoryName}`)).rejects.toMatchObject({
        code: expect.not.stringMatching(/^ENOENT$/),
      });
    } finally {
      await rmdir(directoryPath);
    }
  });
});
