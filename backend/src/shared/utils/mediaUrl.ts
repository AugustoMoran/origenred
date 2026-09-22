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

export const isPlaceholderMediaUrl = (url?: string | null): boolean => {
  if (!url?.trim()) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('logooficialdefinitivo') ||
    lower.includes('origenred-logo') ||
    lower.endsWith('/logooficialdefinitivo.png')
  );
};

export const isR2ObjectKey = (key?: string | null) => {
  const k = key?.trim();
  if (!k || k.includes('..')) return false;
  return k.includes('/');
};

export const isCloudinaryMediaUrl = (url?: string | null) =>
  Boolean(url?.trim() && /res\.cloudinary\.com/i.test(url));

/** Recupera clave R2 embebida en URL (proxy, R2 público o endpoint privado). */
export const extractStorageKeyFromUrl = (url?: string | null): string | null => {
  if (!url?.trim()) return null;
  const u = url.trim();

  const mediaIdx = u.indexOf('/api/media/');
  if (mediaIdx >= 0) {
    const keyPart = u.slice(mediaIdx + '/api/media/'.length).split('?')[0];
    try {
      return decodeURIComponent(keyPart.replace(/^\//, ''));
    } catch {
      return keyPart.replace(/^\//, '');
    }
  }

  if (r2Config.publicUrl && u.startsWith(r2Config.publicUrl)) {
    return u.slice(r2Config.publicUrl.length).replace(/^\//, '').split('?')[0];
  }

  const privateMatch = u.match(/r2\.cloudflarestorage\.com\/[^/]+\/([^?]+)/i);
  if (privateMatch?.[1]) {
    try {
      return decodeURIComponent(privateMatch[1]);
    } catch {
      return privateMatch[1];
    }
  }

  const r2DevMatch = u.match(/\.r2\.dev\/([^?]+)/i);
  if (r2DevMatch?.[1]) {
    try {
      return decodeURIComponent(r2DevMatch[1]);
    } catch {
      return r2DevMatch[1];
    }
  }

  return null;
};

const effectiveStorageKey = (url?: string | null, storageKey?: string | null) => {
  if (isR2ObjectKey(storageKey)) return storageKey!.trim();
  const fromUrl = extractStorageKeyFromUrl(url);
  if (isR2ObjectKey(fromUrl)) return fromUrl;
  return storageKey?.trim() || null;
};

/** URL pública estable vía API (no expira, no depende del dominio R2 en el cliente). */
export const buildMediaProxyUrl = (storageKey?: string | null, req?: Request): string | null => {
  if (!isR2ObjectKey(storageKey)) return null;
  const key = String(storageKey).replace(/^\//, '');
  const base = getPublicApiBaseUrl(req).replace(/\/+$/, '');
  return `${base}/api/media/${key.split('/').map(encodeURIComponent).join('/')}`;
};

const rewriteUploadPathToApi = (url: string, apiBase?: string): string | null => {
  const base = (apiBase || getPublicApiBaseUrl()).replace(/\/+$/, '');

  if (url.startsWith('/uploads')) {
    return `${base}${url}`;
  }

  try {
    const parsed = new URL(url.replace(/^http:/i, 'https:'));
    if (!parsed.pathname.startsWith('/uploads')) return null;
    const host = parsed.hostname.toLowerCase();
    if (
      FRONTEND_HOSTS.has(host) ||
      host.includes('localhost') ||
      host.includes('onrender.com')
    ) {
      return `${base}${parsed.pathname}`;
    }
  } catch {
    return null;
  }

  return null;
};

const tryPrivateR2ToPublic = (url: string): string | null => {
  if (!url.includes('r2.cloudflarestorage.com') || url.includes('.r2.dev')) return null;
  const fromKey = url.match(/r2\.cloudflarestorage\.com\/[^/]+\/(.+)$/i);
  if (!fromKey?.[1] || !r2Config.publicUrl) return null;
  return `${r2Config.publicUrl}/${decodeURIComponent(fromKey[1])}`;
};

/**
 * Resuelve la mejor URL para mostrar o guardar. Nunca devuelve el logo placeholder.
 */
export const resolveStoredMediaUrl = (
  url?: string | null,
  storageKey?: string | null,
  req?: Request
): string => {
  const key = effectiveStorageKey(url, storageKey);
  if (isR2ObjectKey(key)) {
    const proxy = buildMediaProxyUrl(key, req);
    if (proxy) return proxy;
    if (r2Config.publicUrl) {
      return `${r2Config.publicUrl}/${String(key).replace(/^\//, '')}`;
    }
  }

  const trimmed = url?.trim();
  if (trimmed && isCloudinaryMediaUrl(trimmed)) {
    return trimmed.replace(/^http:/i, 'https:');
  }

  if (trimmed && !isPlaceholderMediaUrl(trimmed)) {
    if (trimmed.includes('/api/media/')) {
      return trimmed.replace(/^http:/i, 'https:');
    }

    const rewritten = rewriteUploadPathToApi(trimmed);
    if (rewritten) return rewritten;

    if (/^https?:\/\//i.test(trimmed)) {
      const https = trimmed.replace(/^http:/i, 'https:');
      const privateR2 = tryPrivateR2ToPublic(https);
      return privateR2 || https;
    }

    if (trimmed.startsWith('/uploads')) {
      return `${getPublicApiBaseUrl(req).replace(/\/+$/, '')}${trimmed}`;
    }
  }

  return '';
};

/** Solo para respuestas HTTP al cliente (fallback visual). */
export const normalizeMediaUrl = (url?: string | null, storageKey?: string | null, req?: Request): string => {
  const resolved = resolveStoredMediaUrl(url, storageKey, req);
  if (resolved) return resolved;
  const raw = url?.trim();
  if (raw && !isPlaceholderMediaUrl(raw)) {
    return raw.replace(/^http:/i, 'https:');
  }
  return DEFAULT_PLACEHOLDER;
};

export const canonicalizeMediaUrl = (url?: string | null, storageKey?: string | null, req?: Request) =>
  resolveStoredMediaUrl(url, storageKey, req);

const toPlainDoc = <T extends Record<string, any>>(value: T): T => {
  const maybeDoc = value as { toObject?: () => T };
  if (value && typeof maybeDoc.toObject === 'function') {
    return maybeDoc.toObject();
  }
  return value;
};

const resolveForApiResponse = (url?: string | null, storageKey?: string | null, req?: Request) => {
  const resolved = resolveStoredMediaUrl(url, storageKey, req);
  if (resolved) return resolved;
  const raw = url?.trim();
  if (raw && !isPlaceholderMediaUrl(raw)) {
    return raw.replace(/^http:/i, 'https:');
  }
  return DEFAULT_PLACEHOLDER;
};

export const normalizeProductMedia = <T extends Record<string, any>>(product: T, req?: Request): T => {
  const next = { ...toPlainDoc(product) } as T & {
    imageUrl?: string;
    imagePublicId?: string;
    gallery?: Array<{ url?: string; alt?: string; publicId?: string }>;
  };
  if ('imageUrl' in next) {
    next.imageUrl = resolveForApiResponse(next.imageUrl, next.imagePublicId, req);
  }
  if (Array.isArray(next.gallery)) {
    next.gallery = next.gallery.map((item) => ({
      ...item,
      url: resolveForApiResponse(item?.url, item?.publicId, req),
    }));
  }
  return next as T;
};

export const normalizeListingMedia = <T extends Record<string, any>>(listing: T, req?: Request): T => {
  const next = { ...listing } as T & {
    images?: Array<{ url?: string; alt?: string; key?: string }>;
  };
  if (Array.isArray(next.images)) {
    next.images = next.images.map((item) => ({
      ...item,
      url: normalizeMediaUrl(item?.url, item?.key, req),
    }));
  }
  return next as T;
};

export const repairProductMediaInPlace = (product: {
  imageUrl?: string;
  imagePublicId?: string;
  gallery?: Array<{ url?: string; publicId?: string; alt?: string }>;
}) => {
  let changed = false;

  const inferredFromUrl = extractStorageKeyFromUrl(product.imageUrl);
  if (isPlaceholderMediaUrl(product.imageUrl) && isR2ObjectKey(inferredFromUrl)) {
    product.imagePublicId = inferredFromUrl!;
    const fixed = resolveStoredMediaUrl(product.imageUrl, inferredFromUrl);
    if (fixed) {
      product.imageUrl = fixed;
      changed = true;
    }
  } else if (isPlaceholderMediaUrl(product.imageUrl) && isR2ObjectKey(product.imagePublicId)) {
    const fixed = resolveStoredMediaUrl(product.imageUrl, product.imagePublicId);
    if (fixed) {
      product.imageUrl = fixed;
      changed = true;
    }
  } else if (product.imageUrl && !isPlaceholderMediaUrl(product.imageUrl)) {
    const fixed = resolveStoredMediaUrl(product.imageUrl, product.imagePublicId);
    if (fixed && fixed !== product.imageUrl) {
      product.imageUrl = fixed;
      changed = true;
    }
  }

  if (Array.isArray(product.gallery)) {
    product.gallery = product.gallery.map((item) => {
      const fixed = resolveStoredMediaUrl(item.url, item.publicId);
      if (!fixed) return item;
      if (fixed !== item.url) changed = true;
      return { ...item, url: fixed };
    });
  }

  return changed;
};
