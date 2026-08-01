import { Request, Response } from 'express';
import * as settingsService from '../services/settingsService';

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
    res.json(settings);
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
