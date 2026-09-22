import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { buildMediaProxyUrl } from '../../../shared/utils/mediaUrl';
import { Upload } from '@aws-sdk/lib-storage';
import { randomUUID } from 'crypto';
import path from 'path';
import { features, r2Config } from '../../../config/features';

let client: S3Client | null = null;

const getClient = () => {
  if (!features.r2) return null;
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: r2Config.endpoint,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
    });
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

export const isR2Enabled = () => features.r2;

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

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: r2Config.bucket,
      Key: key,
      Body: input.buffer,
      ContentType: input.mimeType,
    },
  });

  try {
    await upload.done();
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name || '';
    const message = String((err as { message?: string })?.message || err);
    if (
      name === 'Unauthorized' ||
      message.includes('Unauthorized') ||
      message.includes('Access Denied')
    ) {
      throw new Error(
        'No se pudieron subir las imágenes: las credenciales de Cloudflare R2 en el servidor no son válidas. ' +
          'Revisá R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY en Render, o guardá la publicación sin fotos.'
      );
    }
    throw err;
  }

  const proxyUrl = buildMediaProxyUrl(key);
  return {
    key,
    url: proxyUrl || buildPublicUrl(key),
  };
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
