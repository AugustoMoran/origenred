import dotenv from 'dotenv';

dotenv.config();

const truthy = (value?: string) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());

export const features = {
  r2: Boolean(
    process.env.R2_ENDPOINT &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
  ),
  meilisearch: Boolean(process.env.MEILISEARCH_HOST && process.env.MEILISEARCH_API_KEY),
  mercadoPago: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN && process.env.MERCADOPAGO_PUBLIC_KEY),
  mercadoPagoConnect: Boolean(
    process.env.MERCADOPAGO_CLIENT_ID &&
      process.env.MERCADOPAGO_CLIENT_SECRET &&
      process.env.MERCADOPAGO_ACCESS_TOKEN
  ),
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
  endpoint: process.env.R2_ENDPOINT || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  bucket: process.env.R2_BUCKET_NAME || 'origenred-media',
  publicUrl: (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, ''),
};

export const meilisearchConfig = {
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY || '',
};
