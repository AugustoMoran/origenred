import React from 'react';
import { Link } from 'react-router-dom';
import {
  useGetMercadoPagoConnectQuery,
  useGetMySellerProfileQuery,
  useGetIntegrationsQuery,
} from '../../../services/marketplaceApi';
import { useMarketplaceCommission } from '../../../hooks/useMarketplaceCommission';

export const SellerMercadoPagoPage: React.FC = () => {
  const { data: profile } = useGetMySellerProfileQuery();
  const { data, isLoading, isError, error } = useGetMercadoPagoConnectQuery();
  const { data: integrations } = useGetIntegrationsQuery();
  const commissionFromApi = useMarketplaceCommission();

  if (isLoading) return <p className="text-slate-400">Cargando...</p>;

  const connected = profile?.mercadoPagoConnected || data?.mercadoPagoConnected;
  const commissionPercent = data?.commissionPercent ?? commissionFromApi ?? 5;
  const sellerSharePercent = Math.max(0, 100 - commissionPercent);
  const mpIntegration = integrations?.mercadoPago as { connectEnabled?: boolean } | undefined;
  const connectConfigured =
    data?.connectEnabled === true || mpIntegration?.connectEnabled === true;
  const missing = connectConfigured ? [] : data?.missingConnect ?? [];
  const needsProfile = data?.needsSellerProfile || (!profile && connectConfigured);
  const connectUrl = data?.url;
  const apiMessage = (error as { data?: { message?: string } })?.data?.message || data?.message;

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
        ) : connectConfigured && connectUrl ? (
          <a
            href={connectUrl}
            className="inline-flex items-center px-6 py-3 bg-[#009EE3] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Vincular cuenta de Mercado Pago
          </a>
        ) : connectConfigured && (needsProfile || isError) ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3 rounded-xl space-y-2">
            <p className="font-medium">Mercado Pago está configurado en el servidor, pero tu usuario no puede vincular aún.</p>
            <p>
              {apiMessage ||
                'Necesitás un perfil de vendedor aprobado vinculado a esta cuenta (no alcanza con ser admin del panel).'}
            </p>
            <Link to="/vender" className="inline-block text-or-red font-semibold hover:underline">
              Solicitar perfil de vendedor →
            </Link>
            {profile?.status === 'pending' && (
              <p className="text-xs">Tu solicitud está pendiente de aprobación en el panel admin.</p>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl space-y-2">
            <p>
              Mercado Pago Connect no está activo en el servidor. En Render cargá las credenciales OAuth de tu app en
              Mercado Pago Developers:
            </p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li><code className="bg-amber-100/80 px-1 rounded">MERCADOPAGO_CLIENT_ID</code></li>
              <li><code className="bg-amber-100/80 px-1 rounded">MERCADOPAGO_CLIENT_SECRET</code></li>
              <li><code className="bg-amber-100/80 px-1 rounded">MERCADOPAGO_ACCESS_TOKEN</code> (cuenta plataforma)</li>
            </ul>
            {missing.length > 0 && (
              <p className="text-xs font-medium pt-1">Faltan en el servidor: {missing.join(', ')}</p>
            )}
          </div>
        )}

        {connectConfigured && data?.redirectUri && !connected && (
          <p className="text-xs text-slate-500">
            Redirect OAuth: <span className="font-mono break-all">{data.redirectUri}</span>
          </p>
        )}
      </div>
    </div>
  );
};
