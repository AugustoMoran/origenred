import fs from 'fs';
import path from 'path';

let cachedLogo: Buffer | null | undefined;

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
  if (cachedLogo !== undefined) {
    return cachedLogo;
  }

  for (const logoPath of candidateLogoPaths()) {
    try {
      if (fs.existsSync(logoPath)) {
        cachedLogo = fs.readFileSync(logoPath);
        return cachedLogo;
      }
    } catch {
      // Intencionalmente silencioso: fallback a siguiente candidato
    }
  }

  cachedLogo = null;
  return cachedLogo;
};
