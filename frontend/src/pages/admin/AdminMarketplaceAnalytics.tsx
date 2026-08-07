import React from 'react';
import { useGetMarketplaceAnalyticsQuery } from '../../services/marketplaceApi';

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const AdminMarketplaceAnalytics: React.FC = () => {
  const { data, isLoading, error } = useGetMarketplaceAnalyticsQuery();

  if (isLoading) return <p className="text-slate-500">Cargando analytics...</p>;
  if (error || !data) return <p className="text-red-400">No se pudieron cargar los datos</p>;

  const { totals, ordersByStatus, topSellers, gmvLast30Days } = data;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics Marketplace</h1>
        <p className="text-sm text-slate-500 mt-1">Ventas, comisiones y actividad de vendedores</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'GMV', value: format(totals.gmv) },
          { label: 'Pedidos pagados', value: String(totals.orderCount) },
          { label: 'Comisión OrigenRed', value: format(totals.commissionTotal) },
          { label: 'Vendedores activos', value: String(totals.activeSellers) },
          { label: 'Pendientes aprobar', value: String(totals.pendingSellers) },
          { label: 'Denuncias abiertas', value: String(totals.pendingReports) },
          { label: 'Devoluciones abiertas', value: String(totals.pendingReturns ?? 0) },
          { label: 'Servicios solicitados', value: String(totals.pendingServiceLeads ?? 0) },
          { label: 'Publicaciones activas', value: String(totals.activeListings) },
        ].map((card) => (
          <div key={card.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-slate-400">{card.label}</p>
            <p className="text-xl font-bold text-white mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Pedidos por estado</h2>
          <div className="space-y-2">
            {ordersByStatus.map((row) => (
              <div key={row.status} className="flex justify-between text-sm">
                <span className="text-slate-400">{row.status}</span>
                <span className="text-white font-medium">{row.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Top vendedores (revenue)</h2>
          <div className="space-y-2">
            {topSellers.length === 0 ? (
              <p className="text-slate-500 text-sm">Sin datos</p>
            ) : (
              topSellers.map((s) => (
                <div key={s.sellerId} className="flex justify-between text-sm gap-4">
                  <span className="text-slate-300 truncate">{s.sellerName}</span>
                  <span className="text-white font-medium shrink-0">{format(s.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">GMV últimos 30 días</h2>
        {gmvLast30Days.length === 0 ? (
          <p className="text-slate-500 text-sm">Sin ventas en el período</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {gmvLast30Days.slice(-12).map((d) => (
              <div key={d.date} className="bg-black/20 rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-400">{d.date}</p>
                <p className="text-sm font-bold text-white mt-1">{format(d.total)}</p>
                <p className="text-[10px] text-slate-500">{d.count} ped.</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
