import fs from 'fs';
import path from 'path';

let cachedLogo: Buffer | null | undefined;

const MAX_LOGO_BYTES = 400 * 1024; // 400KB
const MAX_LOGO_DIMENSION = 4096;

const readPngDimensions = (buffer: Buffer): { width: number; height: number } | null => {
  // PNG signature (8 bytes) + IHDR chunk where width/height are bytes 16..23
  if (buffer.length < 24) return null;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (!isPng) return null;

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
};

const isLogoSafe = (buffer: Buffer): boolean => {
  if (buffer.length > MAX_LOGO_BYTES) return false;

  const dims = readPngDimensions(buffer);
  if (!dims) return true;

  return dims.width <= MAX_LOGO_DIMENSION && dims.height <= MAX_LOGO_DIMENSION;
};

const candidateLogoPaths = (): string[] => {
  const envPath = process.env.BRAND_LOGO_PATH;

  return [
    envPath,
    path.resolve(process.cwd(), 'public', 'brand-logo.png'),
    path.resolve(process.cwd(), '..', 'frontend', 'public', 'brand-logo.png'),
    path.resolve(process.cwd(), '..', 'frontend', 'oso negro.png'),
  ].filter((value): value is string => Boolean(value));
};

export const getBrandLogoBuffer = (): Buffer | null => {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  if (cachedLogo !== undefined) {
    return cachedLogo;
  }

  for (const logoPath of candidateLogoPaths()) {
    try {
      if (fs.existsSync(logoPath)) {
        const candidate = fs.readFileSync(logoPath);
        if (!isLogoSafe(candidate)) {
          continue;
        }
        cachedLogo = candidate;
        return cachedLogo;
      }
    } catch {
      // Intencionalmente silencioso: fallback a siguiente candidato
    }
  }

  cachedLogo = null;
  return cachedLogo;
};
