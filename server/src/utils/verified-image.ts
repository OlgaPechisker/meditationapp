import { fileTypeFromBuffer } from "file-type";

const verifiedImageTypes = {
  "image/jpeg": { extension: "jpg" },
  "image/png": { extension: "png" },
  "image/webp": { extension: "webp" },
  "image/gif": { extension: "gif" },
} as const;

export type VerifiedImageContentType = keyof typeof verifiedImageTypes;
export type VerifiedImageExtension = (typeof verifiedImageTypes)[VerifiedImageContentType]["extension"];

export interface VerifiedImage {
  contentType: VerifiedImageContentType;
  extension: VerifiedImageExtension;
}

const publicImageFilenamePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:jpe?g|png|webp|gif)$/i;
const serverOwnedImageFilenamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|gif)$/;

function hasPrefix(buffer: Buffer, prefix: number[]): boolean {
  return buffer.length >= prefix.length && prefix.every((value, index) => buffer[index] === value);
}

function isJpeg(buffer: Buffer): boolean {
  if (!hasPrefix(buffer, [0xff, 0xd8])) {
    return false;
  }

  let offset = 2;
  let hasFrame = false;
  let hasScan = false;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      return false;
    }

    while (buffer[offset] === 0xff) {
      offset += 1;
    }

    if (offset >= buffer.length) {
      return false;
    }

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd9) {
      return hasFrame && hasScan && offset === buffer.length;
    }

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (offset + 2 > buffer.length) {
      return false;
    }

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      return false;
    }

    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      hasFrame = true;
    }

    offset += segmentLength;

    if (marker !== 0xda) {
      continue;
    }

    hasScan = true;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const markerOffset = offset;
      while (buffer[offset] === 0xff) {
        offset += 1;
      }

      if (offset >= buffer.length) {
        return false;
      }

      const scanMarker = buffer[offset];
      if (scanMarker === 0x00 || (scanMarker >= 0xd0 && scanMarker <= 0xd7)) {
        offset += 1;
        continue;
      }

      offset = markerOffset;
      break;
    }
  }

  return false;
}

function hasValidPngBitDepth(colorType: number, bitDepth: number): boolean {
  switch (colorType) {
    case 0:
      return [1, 2, 4, 8, 16].includes(bitDepth);
    case 2:
    case 4:
    case 6:
      return bitDepth === 8 || bitDepth === 16;
    case 3:
      return [1, 2, 4, 8].includes(bitDepth);
    default:
      return false;
  }
}

function isPng(buffer: Buffer): boolean {
  if (!hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return false;
  }

  let offset = 8;
  let hasImageData = false;
  let isFirstChunk = true;

  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) {
      return false;
    }

    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataOffset = offset + 8;
    const nextOffset = dataOffset + length + 4;

    if (nextOffset > buffer.length) {
      return false;
    }

    if (isFirstChunk) {
      if (
        type !== "IHDR" ||
        length !== 13 ||
        buffer.readUInt32BE(dataOffset) === 0 ||
        buffer.readUInt32BE(dataOffset + 4) === 0 ||
        !hasValidPngBitDepth(buffer[dataOffset + 9], buffer[dataOffset + 8]) ||
        buffer[dataOffset + 10] !== 0 ||
        buffer[dataOffset + 11] !== 0 ||
        buffer[dataOffset + 12] > 1
      ) {
        return false;
      }
      isFirstChunk = false;
    }

    if (type === "IDAT") {
      hasImageData = true;
    }

    if (type === "IEND") {
      return length === 0 && hasImageData && nextOffset === buffer.length;
    }

    offset = nextOffset;
  }

  return false;
}

function advanceGifSubBlocks(buffer: Buffer, offset: number): number | undefined {
  while (offset < buffer.length) {
    const blockLength = buffer[offset];
    offset += 1;
    if (blockLength === 0) {
      return offset;
    }
    if (offset + blockLength > buffer.length) {
      return undefined;
    }
    offset += blockLength;
  }

  return undefined;
}

function isGif(buffer: Buffer): boolean {
  if (
    buffer.length < 14 ||
    (buffer.toString("ascii", 0, 6) !== "GIF87a" && buffer.toString("ascii", 0, 6) !== "GIF89a")
  ) {
    return false;
  }

  let offset = 13;
  const globalColorTableSize = buffer[10] & 0x80
    ? 3 * (1 << ((buffer[10] & 0x07) + 1))
    : 0;
  if (offset + globalColorTableSize > buffer.length) {
    return false;
  }
  offset += globalColorTableSize;

  let hasImage = false;
  while (offset < buffer.length) {
    const introducer = buffer[offset];
    offset += 1;

    if (introducer === 0x3b) {
      return hasImage && offset === buffer.length;
    }

    if (introducer === 0x21) {
      if (offset >= buffer.length) {
        return false;
      }
      offset += 1;
      const nextOffset = advanceGifSubBlocks(buffer, offset);
      if (nextOffset === undefined) {
        return false;
      }
      offset = nextOffset;
      continue;
    }

    if (introducer !== 0x2c || offset + 9 > buffer.length) {
      return false;
    }

    if (buffer.readUInt16LE(offset + 4) === 0 || buffer.readUInt16LE(offset + 6) === 0) {
      return false;
    }

    const packedFields = buffer[offset + 8];
    offset += 9;
    const localColorTableSize = packedFields & 0x80
      ? 3 * (1 << ((packedFields & 0x07) + 1))
      : 0;
    if (offset + localColorTableSize >= buffer.length) {
      return false;
    }
    offset += localColorTableSize;

    const lzwMinimumCodeSize = buffer[offset];
    if (lzwMinimumCodeSize < 2 || lzwMinimumCodeSize > 8) {
      return false;
    }
    offset += 1;

    const nextOffset = advanceGifSubBlocks(buffer, offset);
    if (nextOffset === undefined) {
      return false;
    }
    offset = nextOffset;
    hasImage = true;
  }

  return false;
}

function isWebp(buffer: Buffer): boolean {
  if (
    buffer.length < 20 ||
    !hasPrefix(buffer, [0x52, 0x49, 0x46, 0x46]) ||
    buffer.toString("ascii", 8, 12) !== "WEBP" ||
    buffer.readUInt32LE(4) + 8 !== buffer.length
  ) {
    return false;
  }

  let offset = 12;
  let hasImageChunk = false;
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      return false;
    }

    const type = buffer.toString("ascii", offset, offset + 4);
    const length = buffer.readUInt32LE(offset + 4);
    const paddedLength = length + (length % 2);
    const nextOffset = offset + 8 + paddedLength;
    if (nextOffset > buffer.length) {
      return false;
    }

    if (type === "VP8 " || type === "VP8L" || type === "ANMF") {
      hasImageChunk = true;
    }

    offset = nextOffset;
  }

  return hasImageChunk && offset === buffer.length;
}

function hasValidStructure(buffer: Buffer, contentType: VerifiedImageContentType): boolean {
  switch (contentType) {
    case "image/jpeg":
      return isJpeg(buffer);
    case "image/png":
      return isPng(buffer);
    case "image/webp":
      return isWebp(buffer);
    case "image/gif":
      return isGif(buffer);
  }
}

export async function inspectVerifiedImage(buffer: Buffer): Promise<VerifiedImage | undefined> {
  if (buffer.length === 0) {
    return undefined;
  }

  try {
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected) {
      return undefined;
    }

    const contentType = detected.mime as VerifiedImageContentType;
    const verifiedImage = verifiedImageTypes[contentType];
    if (!verifiedImage || detected.ext !== verifiedImage.extension || !hasValidStructure(buffer, contentType)) {
      return undefined;
    }

    return { contentType, extension: verifiedImage.extension };
  } catch {
    return undefined;
  }
}

function fileExtension(filename: string): string | undefined {
  const extensionStart = filename.lastIndexOf(".");
  return extensionStart === -1 ? undefined : filename.slice(extensionStart + 1).toLowerCase();
}

export function isPublicImageFilename(filename: string, image: VerifiedImage): boolean {
  if (!publicImageFilenamePattern.test(filename)) {
    return false;
  }

  const extension = fileExtension(filename);
  return image.contentType === "image/jpeg"
    ? extension === "jpg" || extension === "jpeg"
    : extension === image.extension;
}

export function isServerOwnedImageFilename(
  filename: string,
  contentType: VerifiedImageContentType,
): boolean {
  return serverOwnedImageFilenamePattern.test(filename) &&
    fileExtension(filename) === verifiedImageTypes[contentType].extension;
}
