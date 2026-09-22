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

export const isR2ObjectKey = (key?: string | null) => {
  const k = key?.trim();
  if (!k || k.includes('..')) return false;
  return k.includes('/');
};

export const apiOrigin = () => {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  return raw.replace(/\/api\/?$/, '');
};

export const buildMediaProxyUrl = (storageKey?: string | null): string | null => {
  if (!isR2ObjectKey(storageKey)) return null;
  const key = String(storageKey).replace(/^\//, '');
  return `${apiOrigin()}/api/media/${key.split('/').map(encodeURIComponent).join('/')}`;
};
