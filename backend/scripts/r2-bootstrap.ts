/**
 * Crea el bucket R2 si no existe y habilita dominio público r2.dev (opcional).
 * Uso: npm run r2:bootstrap
 */
import dotenv from 'dotenv';
import axios from 'axios';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Config, features } from '../src/config/features';

dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

const accountIdFromEndpoint = () => {
  const match = r2Config.endpoint.match(/https:\/\/([^.]+)\.r2\.cloudflarestorage\.com/);
  return match?.[1] || '';
};

async function cloudflareApi<T>(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = accountIdFromEndpoint();
  if (!token || !accountId) {
    throw new Error('Faltan CLOUDFLARE_API_TOKEN o R2_ENDPOINT para API de Cloudflare');
  }

  const res = await axios.request<T>({
    method,
    url: `https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: body,
    validateStatus: () => true,
  });

  if (res.status >= 400) {
    throw new Error(`Cloudflare API ${path} → ${res.status}: ${JSON.stringify(res.data)}`);
  }

  return res.data;
}

async function ensureBucketExists(bucketName: string) {
  const listed = await cloudflareApi<{ result: { buckets: Array<{ name: string }> } }>('/r2/buckets');
  const exists = listed.result?.buckets?.some((b) => b.name === bucketName);
  if (exists) {
    console.log(`Bucket ya existe: ${bucketName}`);
    return;
  }

  await cloudflareApi('/r2/buckets', 'POST', { name: bucketName });
  console.log(`Bucket creado: ${bucketName}`);
}

async function tryPublicDomain(bucketName: string) {
  try {
    const data = await cloudflareApi<{ result: { domain: string } }>(
      `/r2/buckets/${bucketName}/domains/r2.dev`,
      'POST',
      { enabled: true }
    );
    const domain = data.result?.domain;
    if (domain) {
      const publicUrl = `https://${domain}`;
      console.log(`Dominio público R2 habilitado: ${publicUrl}`);
      console.log(`Agregá en Render/local: R2_PUBLIC_URL=${publicUrl}`);
      return publicUrl;
    }
  } catch (err) {
    console.warn('No se pudo habilitar r2.dev automáticamente:', (err as Error).message);
  }
  return '';
}

async function testUpload(bucketName: string) {
  const client = new S3Client({
    region: 'auto',
    endpoint: r2Config.endpoint,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
    },
  });

  const key = 'seed/_bootstrap-test.txt';
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: 'origenred-r2-ok',
      ContentType: 'text/plain',
    })
  );
  console.log(`Upload S3 OK → ${bucketName}/${key}`);
}

async function main() {
  if (!features.r2) {
    console.error('R2 no configurado. Completá R2_* en backend/.env');
    process.exit(1);
  }

  const bucket = r2Config.bucket;
  console.log(`Account (desde endpoint): ${accountIdFromEndpoint()}`);
  console.log(`Bucket objetivo: ${bucket}`);

  if (process.env.CLOUDFLARE_API_TOKEN) {
    try {
      await ensureBucketExists(bucket);
      const publicUrl = await tryPublicDomain(bucket);
      if (publicUrl) {
        console.log(`R2_PUBLIC_URL=${publicUrl}`);
      }
    } catch (err) {
      console.warn('API Cloudflare no disponible (token sin permiso Account):', (err as Error).message);
      console.warn('Creá el bucket manualmente en el dashboard si no existe.');
    }
  }

  await testUpload(bucket);
  console.log('\nSi el upload OK, corre: npm run seed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
