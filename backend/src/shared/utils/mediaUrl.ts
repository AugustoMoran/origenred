import { Request } from 'express';

const DEFAULT_PLACEHOLDER = 'https://origenred.vercel.app/logooficialdefinitivo.png';

export const getPublicApiBaseUrl = (req?: Request) => {
  const fromEnv = process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  if (req) {
    const host = req.get('host');
    if (host) {
      const proto =
        process.env.NODE_ENV === 'production' ? 'https' : req.protocol || 'http';
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
  }

  return 'https://origenred-ulob.onrender.com';
};

export const buildLocalUploadUrl = (req: Request, filename: string) => {
  const base = getPublicApiBaseUrl(req).replace(/^http:/, 'https:');
  return `${base}/uploads/${filename}`;
};

export const normalizeMediaUrl = (url?: string | null): string => {
  if (!url || !String(url).trim()) return DEFAULT_PLACEHOLDER;

  let normalized = String(url).trim();

  if (normalized.startsWith('//')) {
    normalized = `https:${normalized}`;
  }

  if (normalized.startsWith('/')) {
    return `https://origenred.vercel.app${normalized}`;
  }

  normalized = normalized.replace(/^http:/i, 'https:');

  if (normalized.includes('picsum.photos')) {
    return DEFAULT_PLACEHOLDER;
  }

  if (normalized.includes('r2.cloudflarestorage.com') && !normalized.includes('.r2.dev')) {
    return DEFAULT_PLACEHOLDER;
  }

  if (/localhost|127\.0\.0\.1/i.test(normalized)) {
    return DEFAULT_PLACEHOLDER;
  }

  return normalized;
};

export const normalizeProductMedia = <T extends Record<string, any>>(product: T): T => {
  const next = { ...product } as T & {
    imageUrl?: string;
    gallery?: Array<{ url?: string; alt?: string }>;
  };
  if ('imageUrl' in next) {
    next.imageUrl = normalizeMediaUrl(next.imageUrl);
  }
  if (Array.isArray(next.gallery)) {
    next.gallery = next.gallery.map((item) => ({
      ...item,
      url: normalizeMediaUrl(item?.url),
    }));
  }
  return next as T;
};

export const normalizeListingMedia = <T extends Record<string, any>>(listing: T): T => {
  const next = { ...listing } as T & {
    images?: Array<{ url?: string; alt?: string; key?: string }>;
  };
  if (Array.isArray(next.images)) {
    next.images = next.images.map((item) => ({
      ...item,
      url: normalizeMediaUrl(item?.url),
    }));
  }
  return next as T;
};
