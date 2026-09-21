import axios from 'axios';
import { features } from '../../../config/features';

const ENVIOPACK_API = 'https://api.enviopack.com';

type TokenCache = { accessToken: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

export const isEnvioPackApiConfigured = () => features.envioPack;

const getCredentials = () => {
  const apiKey = process.env.ENVIOPACK_API_KEY;
  const secret = process.env.ENVIOPACK_SECRET;
  if (!apiKey || !secret) throw new Error('EnvíoPack no configurado (ENVIOPACK_API_KEY / ENVIOPACK_SECRET)');
  return { apiKey, secret };
};

export async function getEnvioPackAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const { apiKey, secret } = getCredentials();
  const { data } = await axios.post(
    `${ENVIOPACK_API}/auth`,
    new URLSearchParams({ 'api-key': apiKey, 'secret-key': secret }),
    {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      timeout: 15_000,
    }
  );

  const accessToken = data?.access_token || data?.token;
  if (!accessToken) throw new Error('EnvíoPack no devolvió access_token');

  const expiresIn = Number(data?.expires_in || 14_000);
  tokenCache = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  return accessToken;
}

export async function envioPackGet<T = unknown>(
  path: string,
  query?: Record<string, string | number | undefined>
): Promise<T> {
  const token = await getEnvioPackAccessToken();
  const params = new URLSearchParams({ access_token: token });
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    }
  }
  const url = `${ENVIOPACK_API}${path}?${params.toString()}`;
  const { data } = await axios.get(url, { timeout: 20_000 });
  return data as T;
}

export async function envioPackPost<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = await getEnvioPackAccessToken();
  const url = `${ENVIOPACK_API}${path}?access_token=${encodeURIComponent(token)}`;
  const { data } = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30_000,
  });
  return data as T;
}
