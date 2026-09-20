import React from 'react';
import { useGetMercadoPagoConnectQuery, useGetMySellerProfileQuery } from '../../../services/marketplaceApi';
import { useMarketplaceCommission } from '../../../hooks/useMarketplaceCommission';

export const SellerMercadoPagoPage: React.FC = () => {
  const { data: profile } = useGetMySellerProfileQuery();
  const { data, isLoading } = useGetMercadoPagoConnectQuery();
  const commissionFromApi = useMarketplaceCommission();

  if (isLoading) return <p className="text-slate-400">Cargando...</p>;

  const connected = profile?.mercadoPagoConnected || data?.mercadoPagoConnected;
  const commissionPercent = data?.commissionPercent ?? commissionFromApi ?? 5;
  const sellerSharePercent = Math.max(0, 100 - commissionPercent);
  const missing = data?.missingConnect ?? [];

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-2xl font-bold text-or-navy">Mercado Pago</h2>
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <p className="text-sm text-slate-500">
          Vinculá tu cuenta de Mercado Pago para recibir el {sellerSharePercent}% de cada venta automáticamente.
          OrigenRed retiene el {commissionPercent}% de comisión sobre el producto (sin incluir envío).
        </p>

        {connected ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl">
            ✓ Cuenta de Mercado Pago vinculada. Ya podés recibir pagos de tus ventas.
          </div>
        ) : data?.enabled && data.url ? (
          <a
            href={data.url}
            className="inline-flex items-center px-6 py-3 bg-[#009EE3] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Vincular cuenta de Mercado Pago
          </a>
        ) : (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl space-y-2">
            <p>
              Mercado Pago Connect no está activo en el servidor. Para habilitar el botón de vinculación, en Render (o tu
              hosting del backend) tenés que cargar las credenciales OAuth de tu aplicación en Mercado Pago Developers:
            </p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li><code className="bg-amber-100/80 px-1 rounded">MERCADOPAGO_CLIENT_ID</code></li>
              <li><code className="bg-amber-100/80 px-1 rounded">MERCADOPAGO_CLIENT_SECRET</code></li>
              <li><code className="bg-amber-100/80 px-1 rounded">MERCADOPAGO_ACCESS_TOKEN</code> (cuenta de la plataforma)</li>
            </ul>
            {missing.length > 0 && (
              <p className="text-xs font-medium pt-1">
                Faltan en el servidor: {missing.join(', ')}
              </p>
            )}
            {data?.redirectUri && (
              <p className="text-xs pt-1">
                Redirect URI configurado: <span className="font-mono break-all">{data.redirectUri}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
