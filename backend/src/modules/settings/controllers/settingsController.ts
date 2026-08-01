import { Request, Response } from 'express';
import * as settingsService from '../services/settingsService';
import { resolveBannerImages } from '../services/settingsService';
import { extractUploadedBannerUrls } from '../utils/bannerUploadParser';

export const getPublicSettingsController = async (_req: Request, res: Response) => {
  try {
    const settings = await settingsService.getPublicSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSettingsController = async (_req: Request, res: Response) => {
  try {
    const settings = await settingsService.getSettings();
    const doc = settings.toObject ? settings.toObject() : settings;
    res.json({
      ...doc,
      bannerImages: resolveBannerImages(doc.bannerImages),
      usingDefaultBanners: !(doc.bannerImages || []).filter(Boolean).length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettingsController = async (req: Request, res: Response) => {
  try {
    const settings = await settingsService.updateSettings(req.body || {});
    res.json(settings);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const uploadBannerImagesController = async (req: Request, res: Response) => {
  try {
    const urls = extractUploadedBannerUrls(req);
    if (!urls.length) {
      return res.status(400).json({ message: 'No se recibieron imágenes válidas' });
    }

    const settings = await settingsService.replaceBannerImages(urls);
    res.json({
      bannerImages: settings.bannerImages,
      usingDefaultBanners: false,
      message: 'Carrusel actualizado correctamente',
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const clearBannerImagesController = async (_req: Request, res: Response) => {
  try {
    await settingsService.clearBannerImages();
    res.json({
      bannerImages: resolveBannerImages([]),
      usingDefaultBanners: true,
      message: 'Carrusel restaurado a imágenes por defecto',
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
