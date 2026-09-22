/** URL de logo usada como fallback — no es imagen de producto. */
export const isPlaceholderMediaUrl = (url?: string | null): boolean => {
  if (!url?.trim()) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('logooficialdefinitivo') ||
    lower.includes('origenred-logo') ||
    lower.endsWith('/logooficialdefinitivo.png')
  );
};

export const isCloudinaryMediaUrl = (url?: string | null) =>
  Boolean(url?.trim() && /res\.cloudinary\.com/i.test(url));

export const isR2ObjectKey = (key?: string | null) => {
  const k = key?.trim();
  if (!k || k.includes('..')) return false;
  return k.includes('/');
};

export const apiOrigin = () => {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  return raw.replace(/\/api\/?$/, '');
};

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

  const publicBase = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/+$/, '');
  if (publicBase && u.startsWith(publicBase)) {
    return u.slice(publicBase.length).replace(/^\//, '').split('?')[0];
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

export const effectiveStorageKey = (url?: string | null, storageKey?: string | null) => {
  const fromUrl = extractStorageKeyFromUrl(url);
  const trimmedKey = storageKey?.trim();
  if (isR2ObjectKey(fromUrl) && isR2ObjectKey(trimmedKey) && fromUrl !== trimmedKey) {
    return fromUrl;
  }
  if (isR2ObjectKey(trimmedKey)) return trimmedKey;
  if (isR2ObjectKey(fromUrl)) return fromUrl;
  return trimmedKey || null;
};

export const buildMediaProxyUrl = (storageKey?: string | null): string | null => {
  const key = effectiveStorageKey(null, storageKey) || storageKey;
  if (!isR2ObjectKey(key)) return null;
  const normalized = String(key).replace(/^\//, '');
  return `${apiOrigin()}/api/media/${normalized.split('/').map(encodeURIComponent).join('/')}`;
};
