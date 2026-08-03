import multer from 'multer';
import { uploadToR2, isR2Enabled } from '../services/r2StorageService';
import fs from 'fs';
import path from 'path';

const localUploadsDir = path.resolve(process.cwd(), 'uploads', 'marketplace');
if (!fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}

const memoryStorage = multer.memoryStorage();
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, localUploadsDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '-').toLowerCase();
    cb(null, `${Date.now()}-${safe}`);
  },
});

export const marketplaceUpload = multer({
  storage: isR2Enabled() ? memoryStorage : diskStorage,
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo imágenes JPG, PNG o WebP'));
  },
});

export const processUploadedImages = async (files: Express.Multer.File[], folder = 'listings') => {
  const results: Array<{ url: string; key?: string }> = [];

  for (const file of files) {
    if (isR2Enabled() && file.buffer) {
      const uploaded = await uploadToR2({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        folder,
      });
      results.push(uploaded);
    } else if (file.path) {
      results.push({ url: `/uploads/marketplace/${path.basename(file.path)}` });
    }
  }

  return results;
};
