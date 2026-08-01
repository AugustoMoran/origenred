import React from 'react';

interface PromoBarProps {
  freeShippingThreshold?: number;
}

export const PromoBar: React.FC<PromoBarProps> = ({ freeShippingThreshold }) => {
  const threshold = Number(freeShippingThreshold || 0);
  if (threshold <= 0) return null;

  return (
    <div className="bg-brand-500/10 border-b border-brand-500/20 text-center py-2 px-4 text-xs sm:text-sm text-brand-200">
      Envío gratis en compras superiores a{' '}
      <span className="font-semibold text-brand-300">
        ${threshold.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
      </span>
    </div>
  );
};
