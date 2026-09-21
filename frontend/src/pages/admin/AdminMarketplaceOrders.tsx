import React from 'react';
import { useGetAdminMarketplaceOrdersQuery } from '../../services/marketplaceApi';

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const AdminMarketplaceOrders: React.FC = () => {
  const { data: orders = [], isLoading, refetch, isFetching } = useGetAdminMarketplaceOrdersQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="page-title">Pedidos marketplace</h1>
        <button type="button" className="btn-secondary" onClick={() => refetch()} disabled={isFetching}>
          Actualizar
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate-400">Cargando...</p>
      ) : orders.length === 0 ? (
        <p className="text-slate-400">No hay pedidos todavía.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table text-sm">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Comprador</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Pago</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {(orders as any[]).map((o) => (
                <tr key={o._id}>
                  <td className="font-mono text-xs">{o.orderNumber}</td>
                  <td>
                    <div>{o.guestName || o.buyer?.name || '—'}</div>
                    <div className="text-xs text-slate-500">{o.guestEmail || o.buyer?.email}</div>
                  </td>
                  <td>{format(o.total)}</td>
                  <td className="capitalize">{String(o.status).replace('_', ' ')}</td>
                  <td className="text-xs">{o.paymentStatus || '—'}</td>
                  <td className="text-xs text-slate-400">
                    {o.createdAt ? new Date(o.createdAt).toLocaleString('es-AR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
