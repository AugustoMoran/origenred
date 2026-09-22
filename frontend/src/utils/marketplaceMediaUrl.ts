import {
  apiOrigin,
  buildMediaProxyUrl,
  effectiveStorageKey,
  extractStorageKeyFromUrl,
  isCloudinaryMediaUrl,
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
  const key = extractStorageKeyFromUrl(url);
  if (isR2ObjectKey(key)) {
    return buildMediaProxyUrl(key);
  }
  if (!url.includes('r2.cloudflarestorage.com') || url.includes('.r2.dev')) return null;
  const match = url.match(/r2\.cloudflarestorage\.com\/[^/]+\/(.+)$/i);
  const base = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/+$/, '');
  if (!match?.[1] || !base) return null;
  return `${base}/${decodeURIComponent(match[1])}`;
};

export const resolveMarketplaceImageUrl = (url?: string | null, storageKey?: string | null): string => {
  const key = effectiveStorageKey(url, storageKey);
  if (isR2ObjectKey(key)) {
    const proxy = buildMediaProxyUrl(key);
    if (proxy) return proxy;
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

    let normalized = trimmed.replace(/^http:/i, 'https:');
    if (normalized.startsWith('/uploads')) {
      return `${apiOrigin()}${normalized}`;
    }

    if (/^https?:\/\//i.test(normalized)) {
      const privateR2 = tryPrivateR2ToPublic(normalized);
      if (privateR2) return privateR2;
      if (normalized.includes('picsum.photos')) return PLACEHOLDER;
      if (normalized.includes('r2.cloudflarestorage.com') && !normalized.includes('.r2.dev')) {
        const proxy = buildMediaProxyUrl(extractStorageKeyFromUrl(normalized));
        return proxy || PLACEHOLDER;
      }
      return normalized;
    }
  }

  if (isR2ObjectKey(key)) {
    return buildMediaProxyUrl(key) || PLACEHOLDER;
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

export const buildImageFallbackUrls = (url?: string | null, storageKey?: string | null): string[] => {
  const list: string[] = [];
  const seen = new Set<string>();
  const add = (value?: string | null) => {
    if (!value || isPlaceholderMediaUrl(value) || seen.has(value)) return;
    seen.add(value);
    list.push(value);
  };

  const key = effectiveStorageKey(url, storageKey);
  add(resolveMarketplaceImageUrl(url, key));

  if (isR2ObjectKey(key)) {
    add(buildMediaProxyUrl(key));
    const publicBase = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/+$/, '');
    if (publicBase) {
      add(`${publicBase}/${String(key).replace(/^\//, '')}`);
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
