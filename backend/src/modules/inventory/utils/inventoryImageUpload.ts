import fs from 'fs';
import path from 'path';
import { Request } from 'express';
import { getMainUploadedImage, getUploadedFiles } from './productFormParser';
import { uploadToR2, isR2Enabled } from '../../marketplace/services/r2StorageService';
import { buildLocalUploadUrl, isPlaceholderMediaUrl, resolveStoredMediaUrl } from '../../../shared/utils/mediaUrl';

const isHttpUrl = (value?: string) => !!value && /^https?:\/\//i.test(value);

const readUploadedBuffer = (file: Express.Multer.File): Buffer | null => {
  if (file.buffer?.length) return file.buffer;
  if (isHttpUrl(file.path)) return null;
  if (!file.filename) return null;
  const localPath = path.resolve(process.cwd(), 'uploads', file.filename);
  if (!fs.existsSync(localPath)) return null;
  return fs.readFileSync(localPath);
};

const persistR2Upload = async (req: Request, file: Express.Multer.File, folder: string) => {
  const buffer = readUploadedBuffer(file);
  if (!buffer) throw new Error('No se pudo leer el archivo de imagen subido');

  const uploaded = await uploadToR2({
    buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    folder,
  });

  const url = resolveStoredMediaUrl(uploaded.url, uploaded.key, req) || uploaded.url;
  return { url, key: uploaded.key };
};

const persistLocalUpload = (req: Request, file: Express.Multer.File) => {
  const url = isHttpUrl(file.path)
    ? file.path
    : buildLocalUploadUrl(req, file.filename || `${Date.now()}-${file.originalname}`);
  return {
    url,
    key: file.filename || file.originalname,
  };
};

const uploadInventoryFile = async (req: Request, file: Express.Multer.File, folder: string) => {
  if (isR2Enabled()) {
    return persistR2Upload(req, file, folder);
  }
  return persistLocalUpload(req, file);
};

const normalizeKeptGalleryItem = (item: { url?: string; publicId?: string; alt?: string }) => {
  if (!item?.url || isPlaceholderMediaUrl(item.url)) return null;
  const url = resolveStoredMediaUrl(item.url, item.publicId) || item.url;
  if (isPlaceholderMediaUrl(url)) return null;
  return {
    url,
    publicId: item.publicId,
    alt: item.alt || '',
  };
};

export async function applyInventoryImagesToProductData(
  req: Request,
  productData: Record<string, any>
) {
  const mainFile = getMainUploadedImage(req);
  const galleryFiles = getUploadedFiles(req).galleryImages || [];
  if (!mainFile && !galleryFiles.length) return;

  const keptGallery = (Array.isArray(productData.gallery) ? productData.gallery : [])
    .map(normalizeKeptGalleryItem)
    .filter(Boolean) as Array<{ url: string; publicId?: string; alt: string }>;

  const uploadedGallery: Array<{ url: string; publicId?: string; alt: string }> = [];

  try {
    if (mainFile) {
      const uploaded = await uploadInventoryFile(req, mainFile, 'inventory/products');
      productData.imageUrl = uploaded.url;
      productData.imagePublicId = uploaded.key;
    }

    for (const file of galleryFiles) {
      const uploaded = await uploadInventoryFile(req, file, 'inventory/gallery');
      uploadedGallery.push({ url: uploaded.url, publicId: uploaded.key, alt: '' });
    }
  } catch (err) {
    const message = (err as Error).message || 'Error al subir imágenes';
    throw new Error(
      message.includes('R2') || message.includes('almacenamiento')
        ? message
        : `No se pudieron guardar las imágenes: ${message}`
    );
  }

  const mergedGallery = [...keptGallery];
  for (const item of uploadedGallery) {
    if (!mergedGallery.some((g) => g.url === item.url)) {
      mergedGallery.push(item);
    }
  }

  if (productData.imageUrl) {
    const featured = {
      url: productData.imageUrl,
      publicId: productData.imagePublicId,
      alt: productData.name || '',
    };
    if (!mergedGallery.some((g) => g.url === featured.url)) {
      mergedGallery.unshift(featured);
    }
  } else if (mergedGallery.length) {
    productData.imageUrl = mergedGallery[0].url;
    productData.imagePublicId = mergedGallery[0].publicId;
  }

  productData.gallery = mergedGallery;
}
