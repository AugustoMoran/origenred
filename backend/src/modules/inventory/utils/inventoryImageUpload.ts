import fs from 'fs';
import path from 'path';
import { Request } from 'express';
import {
  applyMainImageToProductData,
  getMainUploadedImage,
  getUploadedFiles,
} from './productFormParser';
import { uploadToR2, isR2Enabled } from '../../marketplace/services/r2StorageService';
import { buildLocalUploadUrl } from '../../../shared/utils/mediaUrl';

const isHttpUrl = (value?: string) => !!value && /^https?:\/\//i.test(value);

const readUploadedFile = (file: Express.Multer.File) => {
  if (isHttpUrl((file as any).path)) {
    return null;
  }
  const localPath = path.resolve(process.cwd(), 'uploads', file.filename);
  if (!fs.existsSync(localPath)) return null;
  return fs.readFileSync(localPath);
};

export async function applyInventoryImagesToProductData(
  req: Request,
  productData: Record<string, any>
) {
  applyMainImageToProductData(req, productData);

  const mainFile = getMainUploadedImage(req);
  if (mainFile && isR2Enabled()) {
    const buffer = readUploadedFile(mainFile);
    if (buffer) {
      try {
        const uploaded = await uploadToR2({
          buffer,
          originalName: mainFile.originalname,
          mimeType: mainFile.mimetype,
          folder: 'inventory/products',
        });
        productData.imageUrl = uploaded.url;
        productData.imagePublicId = uploaded.key;
        productData.gallery = [
          { url: uploaded.url, publicId: uploaded.key, alt: productData.name || '' },
        ];
      } catch (err) {
        console.error('[inventory] R2 upload failed:', (err as Error).message);
        productData.imageUrl = buildLocalUploadUrl(req, mainFile.filename);
      }
    }
  }

  const galleryFiles = getUploadedFiles(req).galleryImages || [];
  if (galleryFiles.length && isR2Enabled()) {
    const gallery = Array.isArray(productData.gallery) ? [...productData.gallery] : [];
    for (const file of galleryFiles) {
      const buffer = readUploadedFile(file);
      if (!buffer) continue;
      try {
        const uploaded = await uploadToR2({
          buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          folder: 'inventory/gallery',
        });
        gallery.push({ url: uploaded.url, publicId: uploaded.key, alt: '' });
      } catch (err) {
        console.error('[inventory] R2 gallery upload failed:', (err as Error).message);
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
    }
  }
}
