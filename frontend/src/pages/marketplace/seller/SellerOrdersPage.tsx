import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useGetSellerOrdersQuery } from '../../services/marketplaceApi';

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pagado — preparar envío',
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
};

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const SellerOrdersPage: React.FC = () => {
  const { data: orders = [], isLoading } = useGetSellerOrdersQuery();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-or-navy">Mis ventas</h2>

      {isLoading ? (
        <p className="text-slate-400">Cargando...</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
          Todavía no tenés ventas
        </div>
      ) : (
        <div className="space-y-4">
          {(orders as any[]).map((order) => {
            const myItems = order.items?.filter((i: any) => i.seller) || order.items;
            const myTotal = myItems.reduce((acc: number, i: any) => acc + i.subtotal, 0);

            return (
              <div key={order._id} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-or-navy">{order.orderNumber}</p>
                    <p className="text-xs text-slate-400">
                      {order.buyer?.name || order.guestName || order.guestEmail} ·{' '}
                      {new Date(order.createdAt).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-or-navy">{format(myTotal)}</p>
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                </div>

                {myItems.map((item: any) => (
                  <div key={item.listing} className="flex justify-between text-sm text-slate-600">
                    <span>{item.title} ×{item.quantity}</span>
                    <span>{format(item.subtotal)}</span>
                  </div>
                ))}

                {order.chatEnabled && (
                  <Link
                    to={`/cuenta/chat/${order.orderNumber}`}
                    className="text-xs text-or-blue font-medium hover:underline"
                  >
                    💬 Responder al comprador
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
