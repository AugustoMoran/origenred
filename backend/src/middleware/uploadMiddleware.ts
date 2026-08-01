import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const hasCloudinaryConfig =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const localUploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}

const storage = hasCloudinaryConfig
  ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'productos-facturacion',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
      } as any,
    })
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, localUploadsDir),
      filename: (_req, file, cb) => {
        const safeName = file.originalname.replace(/\s+/g, '-').toLowerCase();
        cb(null, `${Date.now()}-${safeName}`);
      },
    });

export const upload = multer({ storage });

const bannerStorage = hasCloudinaryConfig
  ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'store-banners',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 1600, height: 700, crop: 'limit' }],
      } as any,
    })
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, localUploadsDir),
      filename: (_req, file, cb) => {
        const safeName = file.originalname.replace(/\s+/g, '-').toLowerCase();
        cb(null, `banner-${Date.now()}-${safeName}`);
      },
    });

export const bannerUpload = multer({
  storage: bannerStorage,
  limits: { files: 10, fileSize: 5 * 1024 * 1024 },
});

export const deleteImage = async (publicId: string) => {
  if (!hasCloudinaryConfig) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting image from Cloudinary', error);
  }
};
