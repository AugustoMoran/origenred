import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { isR2Enabled } from '../../marketplace/services/r2StorageService';

const hasCloudinaryConfig =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

const localUploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, localUploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '-').toLowerCase();
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const useMemoryForR2 = isR2Enabled() && !hasCloudinaryConfig;

export const inventoryProductUpload = multer({
  storage: useMemoryForR2 ? multer.memoryStorage() : diskStorage,
  limits: { fileSize: 8 * 1024 * 1024, files: 11 },
});
