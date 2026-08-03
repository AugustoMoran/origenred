import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useGetMySellerListingsQuery } from '../../services/marketplaceApi';

interface SellerContext {
  profile?: {
    status: string;
    businessName: string;
    listingCount: number;
    totalSales: number;
    reputationScore: number;
    mercadoPagoConnected: boolean;
  };
}

export const SellerDashboard: React.FC = () => {
  const { profile } = useOutletContext<SellerContext>();
  const { data: listings = [] } = useGetMySellerListingsQuery();

  const active = listings.filter((l) => l.status === 'active').length;
  const draft = listings.filter((l) => l.status === 'draft').length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-or-navy">Resumen</h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Publicaciones activas" value={active} />
        <StatCard label="Borradores" value={draft} />
        <StatCard label="Ventas totales" value={profile?.totalSales ?? 0} />
        <StatCard label="Reputación" value={`${profile?.reputationScore ?? 0}/100`} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
          <h3 className="font-semibold text-or-navy">Mercado Pago</h3>
          <p className="text-sm text-slate-500">
            {profile?.mercadoPagoConnected
              ? '✅ Cuenta vinculada — recibirás pagos automáticamente'
              : 'Vinculá tu cuenta para recibir pagos con split 95/5'}
          </p>
          {!profile?.mercadoPagoConnected && (
            <Link to="/vendedor/mercadopago" className="text-sm text-or-red font-medium hover:underline">
              Conectar Mercado Pago →
            </Link>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
          <h3 className="font-semibold text-or-navy">Acciones rápidas</h3>
          {profile?.status === 'approved' ? (
            <Link
              to="/vendedor/productos/nuevo"
              className="inline-flex items-center px-4 py-2 bg-or-red text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors"
            >
              + Nueva publicación
            </Link>
          ) : (
            <p className="text-sm text-slate-400">Esperá la aprobación para publicar</p>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-5">
    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
    <p className="text-2xl font-bold text-or-navy mt-1">{value}</p>
  </div>
);
