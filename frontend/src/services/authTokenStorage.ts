const STORAGE_KEY = 'origenred_web_auth';

export type StoredAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export function saveAuthTokens(accessToken: string, refreshToken: string): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken, refreshToken })
    );
  } catch {
    // private mode / quota
  }
}

export function loadAuthTokens(): StoredAuthTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthTokens;
    if (parsed?.accessToken && parsed?.refreshToken) return parsed;
  } catch {
    // ignore
  }
  return null;
}

export function clearAuthTokens(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function applyAuthTokensFromPayload(data: unknown): void {
  const payload = data as { accessToken?: string; refreshToken?: string } | null;
  if (payload?.accessToken && payload?.refreshToken) {
    saveAuthTokens(payload.accessToken, payload.refreshToken);
  }
}
