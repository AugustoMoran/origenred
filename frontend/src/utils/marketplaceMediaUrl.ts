import {
  apiOrigin,
  buildMediaProxyUrl,
  isPlaceholderMediaUrl,
  isR2ObjectKey,
} from './mediaUrlHelpers';

const PLACEHOLDER = '/logooficialdefinitivo.png';

const rewriteUploadPathToApi = (url: string): string | null => {
  const origin = apiOrigin();
  if (url.startsWith('/uploads')) return `${origin}${url}`;

  try {
    const parsed = new URL(url.replace(/^http:/i, 'https:'));
    if (!parsed.pathname.startsWith('/uploads')) return null;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'origenred.com' ||
      host === 'www.origenred.com' ||
      host.includes('localhost') ||
      host.includes('onrender.com')
    ) {
      return `${origin}${parsed.pathname}`;
    }
  } catch {
    return null;
  }
  return null;
};

const tryPrivateR2ToPublic = (url: string): string | null => {
  if (!url.includes('r2.cloudflarestorage.com') || url.includes('.r2.dev')) return null;
  const match = url.match(/r2\.cloudflarestorage\.com\/[^/]+\/(.+)$/i);
  const base = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/+$/, '');
  if (!match?.[1] || !base) return null;
  return `${base}/${decodeURIComponent(match[1])}`;
};

export const resolveMarketplaceImageUrl = (url?: string | null, storageKey?: string | null): string => {
  if (isR2ObjectKey(storageKey)) {
    const proxy = buildMediaProxyUrl(storageKey);
    if (proxy) return proxy;
  }

  const trimmed = url?.trim();
  if (trimmed && !isPlaceholderMediaUrl(trimmed)) {
    if (trimmed.includes('/api/media/')) {
      return trimmed.replace(/^http:/i, 'https:');
    }

    const rewritten = rewriteUploadPathToApi(trimmed);
    if (rewritten) return rewritten;

    let normalized = trimmed.replace(/^http:/i, 'https:');
    if (normalized.startsWith('/uploads')) {
      return `${apiOrigin()}${normalized}`;
    }

    if (/^https?:\/\//i.test(normalized)) {
      const privateR2 = tryPrivateR2ToPublic(normalized);
      if (privateR2) return privateR2;
      if (normalized.includes('picsum.photos')) return PLACEHOLDER;
      if (normalized.includes('r2.cloudflarestorage.com') && !normalized.includes('.r2.dev')) {
        return PLACEHOLDER;
      }
      if (isPlaceholderMediaUrl(normalized)) return PLACEHOLDER;
      return normalized;
    }
  }

  if (trimmed && !isPlaceholderMediaUrl(trimmed) && !trimmed.startsWith('/')) {
    return trimmed.replace(/^http:/i, 'https:');
  }

  if (isR2ObjectKey(storageKey)) {
    return buildMediaProxyUrl(storageKey) || PLACEHOLDER;
  }

  return PLACEHOLDER;
};

export const resolveProductImageUrl = (product: {
  imageUrl?: string | null;
  imagePublicId?: string | null;
  gallery?: Array<{ url?: string; publicId?: string }> | null;
}) => {
  const candidates: Array<{ url?: string | null; key?: string | null }> = [
    { url: product.imageUrl, key: product.imagePublicId },
    ...(product.gallery || []).map((item) => ({ url: item.url, key: item.publicId })),
  ];

  for (const candidate of candidates) {
    const resolved = resolveMarketplaceImageUrl(candidate.url, candidate.key);
    if (!isPlaceholderMediaUrl(resolved)) return resolved;
  }

  return PLACEHOLDER;
};

/** Variantes para reintentar si falla la carga (CDN, host viejo, etc.). */
export const buildImageFallbackUrls = (url?: string | null, storageKey?: string | null): string[] => {
  const list: string[] = [];
  const seen = new Set<string>();
  const add = (value?: string | null) => {
    if (!value || isPlaceholderMediaUrl(value) || seen.has(value)) return;
    seen.add(value);
    list.push(value);
  };

  const primary = resolveMarketplaceImageUrl(url, storageKey);
  add(primary);

  if (isR2ObjectKey(storageKey)) {
    add(buildMediaProxyUrl(storageKey));
    const publicBase = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/+$/, '');
    if (publicBase) {
      add(`${publicBase}/${String(storageKey).replace(/^\//, '')}`);
    }
  }

  if (url && !isPlaceholderMediaUrl(url)) {
    add(rewriteUploadPathToApi(url.trim()));
    const https = url.trim().replace(/^http:/i, 'https:');
    add(https);
    add(tryPrivateR2ToPublic(https));
  }

  return list;
};
