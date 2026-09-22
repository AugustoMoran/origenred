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

/**
 * Solo reconstruir desde key cuando es clave R2 (carpeta/objeto), no el filename local de Multer.
 */
export const shouldResolveMediaFromR2Key = (url?: string | null, r2Key?: string | null): boolean => {
  const key = r2Key?.trim();
  if (!key) return false;

  if (key.includes('/')) return true;

  const u = (url || '').toLowerCase();
  if (!u) return false;
  if (u.includes('r2.cloudflarestorage.com') || u.includes('.r2.dev')) return true;

  const publicBase = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/+$/, '');
  if (publicBase && u.startsWith(publicBase)) return true;

  return false;
};
