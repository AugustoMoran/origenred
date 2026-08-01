import { Request } from 'express';

const isHttpUrl = (value?: string) => !!value && /^https?:\/\//i.test(value);

export const getLocalImageUrl = (req: Request, filename: string) =>
  `${req.protocol}://${req.get('host')}/uploads/${filename}`;

const toNumber = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseJsonField = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

export const getUploadedFiles = (req: Request) =>
  (req.files as { [fieldname: string]: Express.Multer.File[] } | undefined) || {};

export const getMainUploadedImage = (req: Request) => {
  const files = getUploadedFiles(req);
  return files.image?.[0];
};

export const applyMainImageToProductData = (req: Request, productData: Record<string, any>) => {
  const uploadedFile = getMainUploadedImage(req);
  if (!uploadedFile) return;

  productData.imageUrl = isHttpUrl((uploadedFile as any).path)
    ? (uploadedFile as any).path
    : getLocalImageUrl(req, uploadedFile.filename);
  productData.imagePublicId = uploadedFile.filename;
};

export const applyEcommerceFieldsToProductData = (req: Request, productData: Record<string, any>) => {
  const weight = toNumber(productData.weight);
  if (weight !== undefined) productData.weight = weight;
  else delete productData.weight;

  const displayOrder = toNumber(productData.displayOrder);
  productData.displayOrder = displayOrder ?? 0;

  const dimensions = parseJsonField(productData.dimensions);
  if (dimensions) productData.dimensions = dimensions;
  else delete productData.dimensions;

  const textFields = [
    'commercialDescription',
    'longDescription',
    'seoTitle',
    'seoDescription',
    'slug',
  ] as const;

  for (const field of textFields) {
    if (productData[field] === '') {
      productData[field] = undefined;
    }
  }

  if ('gallery' in productData) {
    const keptGallery = parseJsonField(productData.gallery);
    delete productData.gallery;

    const gallery = Array.isArray(keptGallery) ? keptGallery.filter((item) => item?.url) : [];
    const galleryFiles = getUploadedFiles(req).galleryImages || [];

    for (const file of galleryFiles) {
      gallery.push({
        url: isHttpUrl((file as any).path)
          ? (file as any).path
          : getLocalImageUrl(req, file.filename),
        publicId: file.filename,
        alt: '',
      });
    }

    productData.gallery = gallery;
  }

  return productData;
};
