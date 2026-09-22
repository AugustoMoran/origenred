import { Request } from 'express';
import { r2Config } from '../../config/features';

const DEFAULT_PLACEHOLDER = 'https://origenred.com/logooficialdefinitivo.png';

const FRONTEND_HOSTS = new Set(['origenred.com', 'www.origenred.com']);

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

export const resolveMediaUrlFromR2Key = (r2Key?: string | null): string | null => {
  const publicBase = r2Config.publicUrl;
  if (!publicBase || !r2Key?.trim()) return null;
  return `${publicBase}/${String(r2Key).replace(/^\//, '')}`;
};

const tryPrivateR2ToPublic = (url: string): string | null => {
  if (!url.includes('r2.cloudflarestorage.com') || url.includes('.r2.dev')) return null;
  const fromKey = url.match(/r2\.cloudflarestorage\.com\/[^/]+\/(.+)$/i);
  if (!fromKey?.[1]) return null;
  const publicBase = r2Config.publicUrl;
  if (!publicBase) return null;
  return `${publicBase}/${decodeURIComponent(fromKey[1])}`;
};

const tryRewriteUploadsOnFrontendHost = (url: string, apiBase: string): string | null => {
  try {
    const parsed = new URL(url);
    if (!FRONTEND_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    if (!parsed.pathname.startsWith('/uploads')) return null;
    return `${apiBase.replace(/\/+$/, '')}${parsed.pathname}`;
  } catch {
    return null;
  }
};

/**
 * URL estable para guardar en DB (nunca reemplaza por placeholder).
 */
export const canonicalizeMediaUrl = (url?: string | null, r2Key?: string | null): string => {
  const fromKey = resolveMediaUrlFromR2Key(r2Key);
  if (fromKey) return fromKey;

  if (!url || !String(url).trim()) return '';

  let normalized = String(url).trim();
  const apiBase = getPublicApiBaseUrl();

  if (normalized.startsWith('//')) {
    normalized = `https:${normalized}`;
  }

  if (normalized.startsWith('/uploads')) {
    return `${apiBase.replace(/\/+$/, '')}${normalized}`;
  }

  normalized = normalized.replace(/^http:/i, 'https:');

  const privateR2 = tryPrivateR2ToPublic(normalized);
  if (privateR2) return privateR2;

  const frontendUploads = tryRewriteUploadsOnFrontendHost(normalized, apiBase);
  if (frontendUploads) return frontendUploads;

  try {
    const parsed = new URL(normalized);
    if (parsed.pathname.startsWith('/uploads')) {
      const host = parsed.hostname.toLowerCase();
      if (FRONTEND_HOSTS.has(host) || host.includes('localhost')) {
        return `${apiBase.replace(/\/+$/, '')}${parsed.pathname}`;
      }
    }
  } catch {
    return '';
  }

  if (normalized.startsWith('/') && !normalized.startsWith('//')) {
    const frontend = (process.env.FRONTEND_URL || 'https://origenred.com').replace(/\/+$/, '');
    return `${frontend}${normalized}`;
  }

  return normalized;
};

/** URL lista para el cliente (con fallback si sigue rota). */
export const normalizeMediaUrl = (url?: string | null, r2Key?: string | null): string => {
  const canonical = canonicalizeMediaUrl(url, r2Key);
  if (!canonical) return DEFAULT_PLACEHOLDER;

  if (canonical.includes('picsum.photos')) {
    return DEFAULT_PLACEHOLDER;
  }

  if (/localhost|127\.0\.0\.1/i.test(canonical)) {
    try {
      const parsed = new URL(canonical);
      if (parsed.pathname.startsWith('/uploads')) {
        return `${getPublicApiBaseUrl()}${parsed.pathname}`;
      }
    } catch {
      return DEFAULT_PLACEHOLDER;
    }
    if (process.env.NODE_ENV === 'production') {
      return DEFAULT_PLACEHOLDER;
    }
  }

  if (canonical.includes('r2.cloudflarestorage.com') && !canonical.includes('.r2.dev')) {
    const fixed = tryPrivateR2ToPublic(canonical);
    return fixed || DEFAULT_PLACEHOLDER;
  }

  return canonical;
};

const toPlainDoc = <T extends Record<string, any>>(value: T): T => {
  const maybeDoc = value as { toObject?: () => T };
  if (value && typeof maybeDoc.toObject === 'function') {
    return maybeDoc.toObject();
  }
  return value;
};

export const normalizeProductMedia = <T extends Record<string, any>>(product: T): T => {
  const next = { ...toPlainDoc(product) } as T & {
    imageUrl?: string;
    imagePublicId?: string;
    gallery?: Array<{ url?: string; alt?: string; publicId?: string }>;
  };
  if ('imageUrl' in next) {
    next.imageUrl = normalizeMediaUrl(next.imageUrl, next.imagePublicId);
  }
  if (Array.isArray(next.gallery)) {
    next.gallery = next.gallery.map((item) => ({
      ...item,
      url: normalizeMediaUrl(item?.url, item?.publicId),
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
      url: normalizeMediaUrl(item?.url, item?.key),
    }));
  }
  return next as T;
};
