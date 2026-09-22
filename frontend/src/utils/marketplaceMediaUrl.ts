const PLACEHOLDER = '/logooficialdefinitivo.png';

const apiOrigin = () => {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  return raw.replace(/\/api\/?$/, '');
};

/** URLs de imágenes de listings (R2, /uploads en API, etc.) */
export const resolveMarketplaceImageUrl = (url?: string | null): string => {
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

  try {
    const parsed = new URL(normalized);
    if (parsed.pathname.startsWith('/uploads')) {
      const host = parsed.hostname.toLowerCase();
      if (host === 'origenred.com' || host === 'www.origenred.com' || host.includes('localhost')) {
        return `${origin}${parsed.pathname}`;
      }
    }
  } catch {
    return PLACEHOLDER;
  }

  if (normalized.includes('picsum.photos')) return PLACEHOLDER;
  if (normalized.includes('r2.cloudflarestorage.com') && !normalized.includes('.r2.dev')) {
    return PLACEHOLDER;
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
