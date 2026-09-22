const PLACEHOLDER = '/logooficialdefinitivo.png';

const apiOrigin = () => {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  return raw.replace(/\/api\/?$/, '');
};

const r2PublicBase = () => {
  const fromEnv = import.meta.env.VITE_R2_PUBLIC_URL as string | undefined;
  return fromEnv?.replace(/\/+$/, '') || '';
};

const resolveFromR2Key = (key?: string | null): string | null => {
  const base = r2PublicBase();
  if (!base || !key?.trim()) return null;
  return `${base}/${String(key).replace(/^\//, '')}`;
};

const tryPrivateR2ToPublic = (url: string): string | null => {
  if (!url.includes('r2.cloudflarestorage.com') || url.includes('.r2.dev')) return null;
  const match = url.match(/r2\.cloudflarestorage\.com\/[^/]+\/(.+)$/i);
  const base = r2PublicBase();
  if (!match?.[1] || !base) return null;
  return `${base}/${decodeURIComponent(match[1])}`;
};

/** URLs de imágenes (R2, /uploads en API, Cloudinary, etc.) */
export const resolveMarketplaceImageUrl = (url?: string | null, r2Key?: string | null): string => {
  const fromKey = resolveFromR2Key(r2Key);
  if (fromKey) return fromKey;

  if (!url?.trim()) return PLACEHOLDER;

  let normalized = url.trim();
  if (normalized.startsWith('//')) normalized = `https:${normalized}`;

  const origin = apiOrigin();

  if (normalized.startsWith('/uploads')) {
    return `${origin}${normalized}`;
  }

  if (normalized.startsWith('/') && !normalized.startsWith('//')) {
    return normalized;
  }

  normalized = normalized.replace(/^http:/i, 'https:');

  const privateR2 = tryPrivateR2ToPublic(normalized);
  if (privateR2) return privateR2;

  try {
    const parsed = new URL(normalized);
    if (parsed.pathname.startsWith('/uploads')) {
      const host = parsed.hostname.toLowerCase();
      if (
        host === 'origenred.com' ||
        host === 'www.origenred.com' ||
        host.includes('localhost') ||
        host.includes('onrender.com')
      ) {
        return `${origin}${parsed.pathname}`;
      }
    }
  } catch {
    return PLACEHOLDER;
  }

  if (normalized.includes('picsum.photos')) return PLACEHOLDER;
  if (normalized.includes('r2.cloudflarestorage.com') && !normalized.includes('.r2.dev')) {
    const fixed = tryPrivateR2ToPublic(normalized);
    return fixed || PLACEHOLDER;
  }

  if (/localhost|127\.0\.0\.1/i.test(normalized) && import.meta.env.PROD) {
    try {
      const parsed = new URL(normalized);
      if (parsed.pathname.startsWith('/uploads')) {
        return `${origin}${parsed.pathname}`;
      }
    } catch {
      return PLACEHOLDER;
    }
    return PLACEHOLDER;
  }

  return normalized;
};

export const resolveProductImageUrl = (product: {
  imageUrl?: string | null;
  imagePublicId?: string | null;
  gallery?: Array<{ url?: string; publicId?: string }> | null;
}) => {
  const galleryFirst = product.gallery?.[0];
  return resolveMarketplaceImageUrl(
    product.imageUrl || galleryFirst?.url,
    product.imagePublicId || galleryFirst?.publicId
  );
};
