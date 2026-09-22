import fs from 'fs';
import path from 'path';
import { Request } from 'express';
import {
  applyMainImageToProductData,
  getMainUploadedImage,
  getUploadedFiles,
} from './productFormParser';
import { uploadToR2, isR2Enabled } from '../../marketplace/services/r2StorageService';
import { buildLocalUploadUrl, resolveStoredMediaUrl } from '../../../shared/utils/mediaUrl';

const isHttpUrl = (value?: string) => !!value && /^https?:\/\//i.test(value);

const readUploadedBuffer = (file: Express.Multer.File): Buffer | null => {
  if (file.buffer?.length) return file.buffer;
  if (isHttpUrl((file as any).path)) return null;
  const localPath = path.resolve(process.cwd(), 'uploads', file.filename);
  if (!fs.existsSync(localPath)) return null;
  return fs.readFileSync(localPath);
};

const persistR2Upload = async (
  req: Request,
  file: Express.Multer.File,
  folder: string
) => {
  const buffer = readUploadedBuffer(file);
  if (!buffer) return null;

  const uploaded = await uploadToR2({
    buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    folder,
  });

  const url = resolveStoredMediaUrl(uploaded.url, uploaded.key, req) || uploaded.url;
  return { url, key: uploaded.key };
};

export async function applyInventoryImagesToProductData(
  req: Request,
  productData: Record<string, any>
) {
  applyMainImageToProductData(req, productData);

  const mainFile = getMainUploadedImage(req);
  if (mainFile && isR2Enabled()) {
    try {
      const uploaded = await persistR2Upload(req, mainFile, 'inventory/products');
      if (uploaded) {
        productData.imageUrl = uploaded.url;
        productData.imagePublicId = uploaded.key;
        productData.gallery = [
          { url: uploaded.url, publicId: uploaded.key, alt: productData.name || '' },
        ];
      }
    } catch (err) {
      console.error('[inventory] R2 upload failed:', (err as Error).message);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'No se pudo guardar la imagen en almacenamiento permanente (R2). Revisá la configuración en el servidor.'
        );
      }
      productData.imageUrl = buildLocalUploadUrl(req, mainFile.filename);
      productData.imagePublicId = mainFile.filename;
    }
  }

  const galleryFiles = getUploadedFiles(req).galleryImages || [];
  if (galleryFiles.length && isR2Enabled()) {
    const gallery = Array.isArray(productData.gallery) ? [...productData.gallery] : [];
    for (const file of galleryFiles) {
      try {
        const uploaded = await persistR2Upload(req, file, 'inventory/gallery');
        if (uploaded) {
          gallery.push({ url: uploaded.url, publicId: uploaded.key, alt: '' });
        }
      } catch (err) {
        console.error('[inventory] R2 gallery upload failed:', (err as Error).message);
        if (process.env.NODE_ENV === 'production') {
          throw new Error('No se pudo guardar una imagen de galería en R2.');
        }
        gallery.push({
          url: buildLocalUploadUrl(req, file.filename),
          publicId: file.filename,
          alt: '',
        });
      }
    }
    productData.gallery = gallery;
    if (!productData.imageUrl && gallery[0]?.url) {
      productData.imageUrl = gallery[0].url;
      productData.imagePublicId = gallery[0].publicId;
    }
  }
}
