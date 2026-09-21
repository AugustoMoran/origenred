export type EnvioPackCostQuote = {
  correo?: { id?: string; nombre?: string };
  despacho?: string;
  modalidad?: string;
  servicio?: string;
  valor?: string | number;
  precio?: string | number;
  cost?: number;
  price?: number;
  horas_entrega?: number;
};

export function buildPaquetesString(dimensions?: { length: number; width: number; height: number }) {
  const h = Math.max(1, Math.round(dimensions?.height || 30));
  const w = Math.max(1, Math.round(dimensions?.width || 20));
  const l = Math.max(1, Math.round(dimensions?.length || 10));
  return `${h}x${w}x${l}`;
}

export function quotePriceValue(q: EnvioPackCostQuote): number {
  const v = Number(q.valor ?? q.precio ?? q.cost ?? q.price ?? 0);
  return Number.isFinite(v) ? v : 0;
}

/** Cotización a domicilio con retiro en depósito del vendedor (despacho D). */
export function pickEnvioPackQuoteForCheckout(
  quotes: EnvioPackCostQuote[],
  targetShippingCost?: number
): EnvioPackCostQuote | null {
  if (!quotes?.length) return null;

  const homeDelivery = quotes.filter((q) => q.modalidad === 'D');
  const withPickup = homeDelivery.filter((q) => q.despacho === 'D');
  const pool = withPickup.length ? withPickup : homeDelivery.length ? homeDelivery : quotes;

  if (targetShippingCost && targetShippingCost > 0) {
    const sorted = [...pool].sort(
      (a, b) => Math.abs(quotePriceValue(a) - targetShippingCost) - Math.abs(quotePriceValue(b) - targetShippingCost)
    );
    return sorted[0] || null;
  }

  const byPrice = [...pool].sort((a, b) => quotePriceValue(a) - quotePriceValue(b));
  return byPrice[0] || null;
}

export function splitStreetNumber(street: string): { calle: string; numero: string } {
  const trimmed = (street || '').trim();
  const match = trimmed.match(/^(.+?)\s+(\d+\w*)$/);
  if (match) return { calle: match[1].slice(0, 50), numero: match[2].slice(0, 5) };
  return { calle: trimmed.slice(0, 50) || 'Sin calle', numero: '0' };
}

export function splitFullName(fullName: string): { nombre: string; apellido: string } {
  const parts = (fullName || 'Comprador').trim().split(/\s+/);
  if (parts.length === 1) return { nombre: parts[0].slice(0, 30), apellido: '-' };
  return {
    nombre: parts[0].slice(0, 30),
    apellido: parts.slice(1).join(' ').slice(0, 30) || '-',
  };
}
