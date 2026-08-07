import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useGetMySellerListingsQuery, useGetSellerDashboardQuery } from '../../../services/marketplaceApi';

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
  const { data: dashboard } = useGetSellerDashboardQuery();

  const active = listings.filter((l) => l.status === 'active').length;
  const draft = listings.filter((l) => l.status === 'draft').length;
  const health = dashboard?.health;
  const recommendations = dashboard?.recommendations || [];

  const healthColor =
    health && health.score >= 85
      ? 'text-green-600'
      : health && health.score >= 50
        ? 'text-amber-600'
        : 'text-red-600';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-or-navy">Resumen</h2>

      {health && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              Salud de tu cuenta
            </p>
            <p className={`text-3xl font-bold mt-1 ${healthColor}`}>{health.score}%</p>
            <p className="text-sm text-slate-500">{health.label}</p>
          </div>
          <div className="flex-1 grid sm:grid-cols-2 gap-2 text-xs text-slate-500">
            {health.factors.slice(0, 6).map((f) => (
              <span key={f.key} className={f.ok ? 'text-green-700' : 'text-slate-400'}>
                {f.ok ? '✓' : '○'} {f.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-2">
          <h3 className="font-semibold text-or-navy text-sm">Recomendaciones</h3>
          <ul className="space-y-2">
            {recommendations.map((rec) => (
              <li key={rec.id} className="text-sm text-slate-700">
                {rec.href ? (
                  <Link to={rec.href} className="hover:text-or-red hover:underline">
                    {rec.message}
                  </Link>
                ) : (
                  rec.message
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

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
            <div className="flex flex-wrap gap-2">
              <Link
                to="/vendedor/productos/nuevo"
                className="inline-flex items-center px-4 py-2 bg-or-red text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors"
              >
                + Nueva publicación
              </Link>
              <Link
                to="/vendedor/aprendizaje"
                className="inline-flex items-center px-4 py-2 bg-or-navy text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Centro de aprendizaje
              </Link>
            </div>
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
