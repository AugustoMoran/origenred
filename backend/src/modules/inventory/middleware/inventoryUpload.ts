import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { isR2Enabled } from '../../marketplace/services/r2StorageService';

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

/** En producción con R2, subimos en memoria y persistimos en el bucket (no disco efímero de Render). */
export const inventoryProductUpload = multer({
  storage: isR2Enabled() ? multer.memoryStorage() : diskStorage,
  limits: { fileSize: 8 * 1024 * 1024, files: 11 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo imágenes JPG, PNG o WebP'));
  },
});
