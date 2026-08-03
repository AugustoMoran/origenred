import React from 'react';
import { useGetMercadoPagoConnectQuery } from '../../../services/marketplaceApi';

export const SellerMercadoPagoPage: React.FC = () => {
  const { data, isLoading } = useGetMercadoPagoConnectQuery();

  if (isLoading) return <p className="text-slate-400">Cargando...</p>;

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-2xl font-bold text-or-navy">Mercado Pago</h2>
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <p className="text-sm text-slate-500">
          Vinculá tu cuenta de Mercado Pago para recibir el 95% de cada venta automáticamente.
          OrigenRed retiene el 5% de comisión sobre el producto (sin incluir envío).
        </p>

        {data?.enabled && data.url ? (
          <a
            href={data.url}
            className="inline-flex items-center px-6 py-3 bg-[#009EE3] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Vincular cuenta de Mercado Pago
          </a>
        ) : (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
            Mercado Pago Connect no está configurado aún. Cuando se carguen las credenciales en el servidor,
            este botón se activará automáticamente.
          </div>
        )}
      </div>
    </div>
  );
};
