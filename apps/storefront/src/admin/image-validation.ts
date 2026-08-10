export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 4096;

const allowedMimeTypes = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export interface ImageFileLike {
  arrayBuffer(): Promise<ArrayBuffer>;
  name: string;
  size: number;
  type: string;
}

export interface ImageMetadata {
  height: number;
  mimeType: string;
  width: number;
}

type DimensionDecoder = (
  file: ImageFileLike,
) => Promise<{ height: number; width: number }>;

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

export function detectImageMime(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 3) === 'PNG' &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(ascii(bytes, 0, 6))) {
    return 'image/gif';
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === 'RIFF' &&
    ascii(bytes, 8, 4) === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 4, 4) === 'ftyp' &&
    ['avif', 'avis'].includes(ascii(bytes, 8, 4))
  ) {
    return 'image/avif';
  }
  return null;
}

async function decodeInBrowser(file: ImageFileLike) {
  if (!(file instanceof Blob)) {
    throw new Error('Image decoding requires a browser File or Blob.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    return { height: bitmap.height, width: bitmap.width };
  } finally {
    bitmap.close();
  }
}

export async function validateImageFile(
  file: ImageFileLike,
  decode: DimensionDecoder = decodeInBrowser,
): Promise<ImageMetadata> {
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error(`${file.name} must be between 1 byte and 8 MB.`);
  }
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error(`${file.name} has an unsupported declared MIME type.`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedMime = detectImageMime(bytes);
  if (!detectedMime) {
    throw new Error(
      `${file.name} does not contain a supported image signature.`,
    );
  }
  if (detectedMime !== file.type) {
    throw new Error(
      `${file.name} declared MIME ${file.type} does not match detected ${detectedMime}.`,
    );
  }
  let dimensions: { height: number; width: number };
  try {
    dimensions = await decode(file);
  } catch (error) {
    throw new Error(`${file.name} could not be decoded as an image.`, {
      cause: error,
    });
  }
  if (
    !Number.isInteger(dimensions.width) ||
    !Number.isInteger(dimensions.height) ||
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    dimensions.width > MAX_IMAGE_DIMENSION ||
    dimensions.height > MAX_IMAGE_DIMENSION
  ) {
    throw new Error(
      `${file.name} dimensions must be between 1 and ${MAX_IMAGE_DIMENSION}px per side.`,
    );
  }
  return {
    height: dimensions.height,
    mimeType: detectedMime,
    width: dimensions.width,
  };
}
