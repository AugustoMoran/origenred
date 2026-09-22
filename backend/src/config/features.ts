import dotenv from 'dotenv';
import { isMercadoPagoConnectConfigured, isMercadoPagoPaymentsConfigured } from './mercadoPagoEnv';

dotenv.config();

const truthy = (value?: string) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());

/** Render/Cloudflare a veces pegan comillas o espacios en secrets. */
export const trimEnv = (value?: string) => {
  let v = String(value ?? '').trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
};

const normalizeR2Endpoint = (endpoint: string) => endpoint.replace(/\/+$/, '');

const r2Endpoint = normalizeR2Endpoint(trimEnv(process.env.R2_ENDPOINT));
const r2AccessKeyId = trimEnv(process.env.R2_ACCESS_KEY_ID);
const r2SecretAccessKey = trimEnv(process.env.R2_SECRET_ACCESS_KEY);
const r2BucketName = trimEnv(process.env.R2_BUCKET_NAME) || 'origenred-media';

export const features = {
  r2: Boolean(r2Endpoint && r2AccessKeyId && r2SecretAccessKey && r2BucketName),
  meilisearch: Boolean(process.env.MEILISEARCH_HOST && process.env.MEILISEARCH_API_KEY),
  mercadoPago: isMercadoPagoPaymentsConfigured(),
  mercadoPagoConnect: isMercadoPagoConnectConfigured(),
  envioPack: Boolean(process.env.ENVIOPACK_API_KEY && process.env.ENVIOPACK_SECRET),
  redis: Boolean(process.env.REDIS_URL),
  afipQueue: truthy(process.env.ENABLE_AFIP_QUEUE),
};

export const marketplaceConfig = {
  commissionPercent: Number(process.env.MARKETPLACE_COMMISSION_PERCENT || 5),
  maxListingsPerSeller: Number(process.env.MAX_LISTINGS_PER_SELLER || 100),
  platformFeePercent: Number(process.env.MERCADOPAGO_PLATFORM_FEE_PERCENT || 5),
};

export const r2Config = {
  endpoint: r2Endpoint,
  accessKeyId: r2AccessKeyId,
  secretAccessKey: r2SecretAccessKey,
  bucket: r2BucketName,
  publicUrl: trimEnv(process.env.R2_PUBLIC_URL).replace(/\/+$/, ''),
};

export const meilisearchConfig = {
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY || '',
};
