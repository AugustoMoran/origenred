import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetSellerOrdersQuery,
  useUpdateSellerOrderMutation,
} from '../../../services/marketplaceApi';

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pagado',
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
};

const FULFILLMENT_LABELS: Record<string, string> = {
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
};

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const SellerOrdersPage: React.FC = () => {
  const { data: orders = [], isLoading, refetch } = useGetSellerOrdersQuery();
  const [updateOrder, { isLoading: updating }] = useUpdateSellerOrderMutation();
  const [trackingByOrder, setTrackingByOrder] = useState<Record<string, string>>({});

  const handleStatus = async (orderNumber: string, status: 'shipped' | 'delivered', trackingCode?: string) => {
    await updateOrder({ orderNumber, status, trackingCode });
    refetch();
  };

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
            const myFulfillment = order.shippingBySeller?.find(
              (s: any) => myItems.some((i: any) => String(i.seller) === String(s.seller))
            );
            const fulfillmentStatus = myFulfillment?.status || 'processing';

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
                      {FULFILLMENT_LABELS[fulfillmentStatus] || STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                </div>

                {myItems.map((item: any) => (
                  <div key={item.listing} className="flex justify-between text-sm text-slate-600">
                    <span>{item.title} ×{item.quantity}</span>
                    <span>{format(item.subtotal)}</span>
                  </div>
                ))}

                {myFulfillment?.trackingCode && (
                  <p className="text-xs text-slate-500">
                    Tracking: <span className="font-mono">{myFulfillment.trackingCode}</span>
                  </p>
                )}

                {fulfillmentStatus === 'processing' && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Código de seguimiento (opcional)"
                      value={trackingByOrder[order.orderNumber] || ''}
                      onChange={(e) =>
                        setTrackingByOrder((prev) => ({ ...prev, [order.orderNumber]: e.target.value }))
                      }
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                    />
                    <button
                      disabled={updating}
                      onClick={() =>
                        handleStatus(
                          order.orderNumber,
                          'shipped',
                          trackingByOrder[order.orderNumber] || undefined
                        )
                      }
                      className="px-4 py-2 bg-or-blue text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                    >
                      Marcar como enviado
                    </button>
                  </div>
                )}

                {fulfillmentStatus === 'shipped' && (
                  <button
                    disabled={updating}
                    onClick={() => handleStatus(order.orderNumber, 'delivered')}
                    className="text-xs text-or-blue font-medium hover:underline disabled:opacity-50"
                  >
                    Marcar como entregado
                  </button>
                )}

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
