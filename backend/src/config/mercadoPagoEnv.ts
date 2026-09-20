/** Lee variables de MP con trim y alias habituales en hosting. */
function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const raw = process.env[key];
    if (raw == null) continue;
    const trimmed = String(raw).trim();
    if (trimmed.length > 0) return trimmed;
  }
  return '';
}

export const mercadoPagoEnv = {
  accessToken: readEnv('MERCADOPAGO_ACCESS_TOKEN', 'MP_ACCESS_TOKEN'),
  publicKey: readEnv('MERCADOPAGO_PUBLIC_KEY', 'MP_PUBLIC_KEY'),
  clientId: readEnv('MERCADOPAGO_CLIENT_ID', 'MP_CLIENT_ID'),
  clientSecret: readEnv('MERCADOPAGO_CLIENT_SECRET', 'MP_CLIENT_SECRET'),
};

export function getMercadoPagoConnectMissingKeys(): string[] {
  const missing: string[] = [];
  if (!mercadoPagoEnv.clientId) missing.push('MERCADOPAGO_CLIENT_ID');
  if (!mercadoPagoEnv.clientSecret) missing.push('MERCADOPAGO_CLIENT_SECRET');
  if (!mercadoPagoEnv.accessToken) missing.push('MERCADOPAGO_ACCESS_TOKEN');
  return missing;
}

export function isMercadoPagoConnectConfigured(): boolean {
  return (
    Boolean(mercadoPagoEnv.clientId) &&
    Boolean(mercadoPagoEnv.clientSecret) &&
    Boolean(mercadoPagoEnv.accessToken)
  );
}

export function isMercadoPagoPaymentsConfigured(): boolean {
  return Boolean(mercadoPagoEnv.accessToken && mercadoPagoEnv.publicKey);
}
