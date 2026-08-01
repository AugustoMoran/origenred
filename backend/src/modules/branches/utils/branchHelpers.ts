import { IBranch } from '../models/Branch';

type BranchLike = Partial<IBranch> | Record<string, unknown> | null | undefined;

export const isBranchComplete = (branch: BranchLike): boolean => {
  if (!branch) return false;

  const name = String((branch as any).name || '').trim();
  const address = String((branch as any).address || '').trim();
  const city = String((branch as any).city || '').trim();
  const province = String((branch as any).province || '').trim();
  const postalCode = String((branch as any).postalCode || '').trim();
  const country = String((branch as any).country || 'Argentina').trim();

  return Boolean(name && address && city && province && postalCode && country);
};
