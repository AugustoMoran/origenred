import React from 'react';

export type PickupShipFrom = {
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  label?: string;
  source?: 'platform' | 'seller';
};

type Props = {
  sellerName: string;
  shipFrom?: PickupShipFrom | null;
  showCoordinationNote?: boolean;
  className?: string;
};

export const PickupLocationCard: React.FC<Props> = ({
  sellerName,
  shipFrom,
  showCoordinationNote = true,
  className = '',
}) => {
  const label =
    shipFrom?.source === 'platform'
      ? shipFrom?.label || 'Depósito OrigenRed'
      : shipFrom?.label || sellerName;

  const street = shipFrom?.street?.trim();
  const city = shipFrom?.city?.trim();
  const province = shipFrom?.province?.trim();
  const postalCode = shipFrom?.postalCode?.trim();

  return (
    <div
      className={`rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-or-navy space-y-2 ${className}`}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
          Punto de retiro
        </p>
        <p className="font-semibold text-or-navy">{label}</p>
        {shipFrom?.source === 'platform' && (
          <p className="text-xs text-slate-500">Operado por OrigenRed</p>
        )}
      </div>
      {street && <p>{street}</p>}
      {(city || province) && (
        <p>
          {[city, province].filter(Boolean).join(', ')}
          {postalCode ? ` (CP ${postalCode})` : ''}
        </p>
      )}
      {!street && !city && !province && (
        <p className="text-slate-600">Dirección a confirmar con el vendedor.</p>
      )}
      {showCoordinationNote && (
        <p className="text-xs text-slate-600 border-t border-emerald-200/80 pt-2 leading-relaxed">
          Coordiná día y horario con el vendedor después del pago. Vas a poder escribirle desde{' '}
          <span className="font-medium">Mis compras</span> en cuanto se confirme el pago.
        </p>
      )}
    </div>
  );
};

export const PickupCheckoutIntro: React.FC = () => (
  <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 leading-relaxed">
    <span className="font-medium text-or-navy">Retiro en persona.</span> Abajo ves el punto de retiro de
    cada vendedor. Una vez confirmado el pago, podés contactarlo para acordar la entrega.
  </p>
);
