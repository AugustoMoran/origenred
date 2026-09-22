import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { buildMediaProxyUrl } from '../../../shared/utils/mediaUrl';
import { randomUUID } from 'crypto';
import path from 'path';
import { features, r2Config } from '../../../config/features';

let client: S3Client | null = null;

const buildS3Client = () =>
  new S3Client({
    region: 'auto',
    endpoint: r2Config.endpoint,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
    },
  });

const getClient = () => {
  if (!features.r2) return null;
  if (!client) {
    client = buildS3Client();
  }
  return client;
};

const buildPublicUrl = (key: string) => {
  if (r2Config.publicUrl) return `${r2Config.publicUrl}/${key}`;
  console.warn(
    '[R2] R2_PUBLIC_URL no está configurado: las URLs privadas de R2 no funcionan en el navegador. Configurá un dominio público en Render.'
  );
  return `${r2Config.endpoint}/${r2Config.bucket}/${key}`;
};

const awsErrorDetails = (err: unknown) => {
  const e = err as {
    name?: string;
    Code?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return {
    code: e.Code || e.name || 'Unknown',
    status: e.$metadata?.httpStatusCode,
    message: String(e.message || err),
  };
};

const formatR2UploadError = (err: unknown): Error => {
  const { code, status, message } = awsErrorDetails(err);
  console.error('[R2] PutObject failed', {
    code,
    status,
    bucket: r2Config.bucket,
    endpointHost: r2Config.endpoint.replace(/^https?:\/\//, '').split('/')[0],
  });

  if (code === 'InvalidAccessKeyId' || /invalidaccesskeyid/i.test(message)) {
    return new Error(
      'No se pudieron subir las imágenes: R2_ACCESS_KEY_ID no es válida. En Cloudflare R2 creá un token S3 (Access Key ID + Secret), no uses el API Token general.'
    );
  }

  if (code === 'SignatureDoesNotMatch' || /signaturedoesnotmatch/i.test(message)) {
    return new Error(
      'No se pudieron subir las imágenes: R2_SECRET_ACCESS_KEY no coincide con la Access Key. Regenerá el par en Cloudflare R2 y actualizá Render.'
    );
  }

  if (
    code === 'AccessDenied' ||
    code === 'Unauthorized' ||
    status === 403 ||
    message.includes('Access Denied') ||
    message.includes('Unauthorized')
  ) {
    return new Error(
      'No se pudieron subir las imágenes: el token R2 no tiene permiso de escritura en el bucket "' +
        r2Config.bucket +
        '". En Cloudflare, el API token debe ser Object Read & Write sobre ese bucket (o Admin Read & Write). Revisá también R2_BUCKET_NAME y R2_ENDPOINT.'
    );
  }

  if (code === 'NoSuchBucket') {
    return new Error(
      `No se pudieron subir las imágenes: el bucket "${r2Config.bucket}" no existe en esa cuenta R2. Revisá R2_BUCKET_NAME en Render.`
    );
  }

  return new Error(`No se pudieron subir las imágenes: ${message || code}`);
};

export const isR2Enabled = () => features.r2;

export const getR2PublicConfig = () => ({
  enabled: features.r2,
  bucket: r2Config.bucket,
  endpointConfigured: Boolean(r2Config.endpoint),
  publicUrlConfigured: Boolean(r2Config.publicUrl),
});

export const uploadToR2 = async (input: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  folder?: string;
}) => {
  const s3 = getClient();
  if (!s3) {
    throw new Error('Cloudflare R2 no configurado. Completá R2_* en .env');
  }

  const ext = path.extname(input.originalName).toLowerCase() || '.jpg';
  const folder = input.folder || 'listings';
  const key = `${folder}/${randomUUID()}${ext}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: r2Config.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      })
    );
  } catch (err: unknown) {
    throw formatR2UploadError(err);
  }

  const proxyUrl = buildMediaProxyUrl(key);
  return {
    key,
    url: proxyUrl || buildPublicUrl(key),
  };
};

export const probeR2WriteAccess = async () => {
  if (!features.r2) {
    return { ok: false as const, reason: 'R2 no configurado (faltan variables R2_*)' };
  }

  const probeKey = `_healthcheck/${randomUUID()}.txt`;
  try {
    const uploaded = await uploadToR2({
      buffer: Buffer.from('origenred-r2-probe'),
      originalName: 'probe.txt',
      mimeType: 'text/plain',
      folder: '_healthcheck',
    });
    await deleteFromR2(uploaded.key);
    return { ok: true as const, bucket: r2Config.bucket };
  } catch (err: unknown) {
    const { code, status, message } = awsErrorDetails(err);
    return {
      ok: false as const,
      code,
      status,
      message: message.slice(0, 300),
      bucket: r2Config.bucket,
    };
  }
};

export const getR2Object = async (key: string) => {
  const s3 = getClient();
  if (!s3) {
    throw new Error('Cloudflare R2 no configurado');
  }
  const normalizedKey = key.replace(/^\//, '');
  return s3.send(
    new GetObjectCommand({
      Bucket: r2Config.bucket,
      Key: normalizedKey,
    })
  );
};

export const deleteFromR2 = async (key: string) => {
  const s3 = getClient();
  if (!s3 || !key) return;

  await s3.send(
    new DeleteObjectCommand({
      Bucket: r2Config.bucket,
      Key: key,
    })
  );
};

export const verifyR2BucketReachable = async () => {
  const s3 = getClient();
  if (!s3) return { ok: false, reason: 'not_configured' as const };
  try {
    await s3.send(new HeadBucketCommand({ Bucket: r2Config.bucket }));
    return { ok: true as const };
  } catch (err: unknown) {
    const { code, status, message } = awsErrorDetails(err);
    return { ok: false as const, code, status, message: message.slice(0, 200) };
  }
};
