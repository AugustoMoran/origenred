import { Request, Response } from 'express';
import * as analyticsService from '../services/analyticsService';

const parseDateParam = (value: unknown, endOfDay = false): Date | undefined => {
  if (!value) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;

  const onlyDate = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = raw.match(onlyDate);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return endOfDay
      ? new Date(year, month, day, 23, 59, 59, 999)
      : new Date(year, month, day, 0, 0, 0, 0);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
};

export const getOverviewAnalyticsController = async (req: Request, res: Response) => {
  try {
    const from = parseDateParam(req.query.from, false);
    const to = parseDateParam(req.query.to, true);
    const data = await analyticsService.getOverviewAnalytics(from, to);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getEcommerceAnalyticsController = async (req: Request, res: Response) => {
  try {
    const from = parseDateParam(req.query.from, false);
    const to = parseDateParam(req.query.to, true);
    const data = await analyticsService.getEcommerceAnalytics(from, to);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
