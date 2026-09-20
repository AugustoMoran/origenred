import { useGetIntegrationsQuery } from '../services/marketplaceApi';

/** Comisión de marketplace desde el servidor (MARKETPLACE_COMMISSION_PERCENT). */
export function useMarketplaceCommission(): number | undefined {
  const { data } = useGetIntegrationsQuery();
  const mp = data?.mercadoPago as { commissionPercent?: number } | undefined;
  return typeof mp?.commissionPercent === 'number' ? mp.commissionPercent : undefined;
}

export function formatCommissionLine(percent: number | undefined, maxListings = 100): string {
  const pct = percent ?? '…';
  return `${maxListings} publicaciones gratis · Comisión ${pct}% solo al vender`;
}
