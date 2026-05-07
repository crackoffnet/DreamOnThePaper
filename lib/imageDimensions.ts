export type ImageDimensions = {
  width: number;
  height: number;
};

export function readImageDimensions(
  bytes: Uint8Array,
  contentType?: string | null,
): ImageDimensions | null {
  return (
    readPngDimensions(bytes, contentType) ||
    readJpegDimensions(bytes, contentType) ||
    readWebpDimensions(bytes, contentType)
  );
}

function readPngDimensions(
  bytes: Uint8Array,
  contentType?: string | null,
) {
  if (contentType && !contentType.includes("png")) {
    return null;
  }

  if (bytes.length < 24) {
    return null;
  }

  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let index = 0; index < pngSignature.length; index += 1) {
    if (bytes[index] !== pngSignature[index]) {
      return null;
    }
  }

  return {
    width: readUint32(bytes, 16),
    height: readUint32(bytes, 20),
  };
}

function readJpegDimensions(
  bytes: Uint8Array,
  contentType?: string | null,
) {
  if (contentType && !contentType.includes("jpeg") && !contentType.includes("jpg")) {
    return null;
  }

  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];

    if (segmentLength < 2) {
      return null;
    }

    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker);

    if (isStartOfFrame && offset + 8 < bytes.length) {
      return {
        height: (bytes[offset + 5] << 8) | bytes[offset + 6],
        width: (bytes[offset + 7] << 8) | bytes[offset + 8],
      };
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function readWebpDimensions(
  bytes: Uint8Array,
  contentType?: string | null,
) {
  if (contentType && !contentType.includes("webp")) {
    return null;
  }

  if (
    bytes.length < 30 ||
    ascii(bytes, 0, 4) !== "RIFF" ||
    ascii(bytes, 8, 12) !== "WEBP"
  ) {
    return null;
  }

  const chunkType = ascii(bytes, 12, 16);
  if (chunkType === "VP8X" && bytes.length >= 30) {
    return {
      width: 1 + read24(bytes, 24),
      height: 1 + read24(bytes, 27),
    };
  }

  if (chunkType === "VP8 " && bytes.length >= 30) {
    return {
      width: bytes[26] | (bytes[27] << 8),
      height: bytes[28] | (bytes[29] << 8),
    };
  }

  if (chunkType === "VP8L" && bytes.length >= 25) {
    const bits =
      bytes[21] |
      (bytes[22] << 8) |
      (bytes[23] << 16) |
      (bytes[24] << 24);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  return null;
}

function readUint32(bytes: Uint8Array, offset: number) {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0;
}

function read24(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}
