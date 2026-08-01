import { Request } from 'express';

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

export const getLocalBannerUrl = (req: Request, filename: string) =>
  `${req.protocol}://${req.get('host')}/uploads/${filename}`;

export const extractUploadedBannerUrls = (req: Request): string[] => {
  const files = (req.files as Express.Multer.File[] | undefined) || [];
  return files
    .map((file) => {
      const cloudUrl = (file as any).path;
      if (isHttpUrl(cloudUrl)) return cloudUrl;
      return getLocalBannerUrl(req, file.filename);
    })
    .filter(Boolean);
};
