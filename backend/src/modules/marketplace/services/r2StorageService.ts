import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

  await upload.done();

  return {
    key,
    url: buildPublicUrl(key),
  };
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
