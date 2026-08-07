import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import { useCancelOrderMutation, useGetMyOrdersQuery } from '../../services/marketplaceApi';

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  paid: 'Pagado',
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const MyOrdersPage: React.FC = () => {
  const { data: orders = [], isLoading, refetch } = useGetMyOrdersQuery();
  const [cancelOrder, { isLoading: cancelling }] = useCancelOrderMutation();

  const handleCancel = async (orderNumber: string) => {
    if (!confirm('¿Cancelar este pedido?')) return;
    try {
      await cancelOrder(orderNumber).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'No se pudo cancelar');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <SEO title="Mis compras — OrigenRed" />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-or-navy">Mis compras</h1>
        <Link to="/cuenta/mensajes" className="text-sm text-or-blue font-medium hover:underline">
          Mensajes
        </Link>
      </div>

      {isLoading ? (
        <p className="text-slate-400">Cargando...</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-400 mb-4">Todavía no hiciste ninguna compra</p>
          <Link to="/buscar" className="text-or-red font-medium hover:underline">Explorar productos →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {(orders as any[]).map((order) => (
            <div key={order._id} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-or-navy">{order.orderNumber}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(order.createdAt).toLocaleDateString('es-AR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-or-navy">{format(order.total)}</p>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                {order.items?.slice(0, 3).map((item: any) => (
                  <div key={item.listing} className="flex justify-between text-sm text-slate-600">
                    <span>{item.title} ×{item.quantity}</span>
                    <span>{format(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {order.trackingCode && (
                <p className="text-xs text-slate-500">
                  Seguimiento: <span className="font-mono">{order.trackingCode}</span>
                </p>
              )}

              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  to={`/cuenta/compras/${order.orderNumber}`}
                  className="text-xs text-or-blue hover:underline"
                >
                  Ver detalle
                </Link>
                {order.chatEnabled && order.status !== 'pending_payment' && (
                  <Link
                    to={`/cuenta/chat/${order.orderNumber}`}
                    className="text-xs text-or-red font-medium hover:underline"
                  >
                    Chatear con vendedor
                  </Link>
                )}
                {order.status === 'pending_payment' && (
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => handleCancel(order.orderNumber)}
                    className="text-xs text-slate-500 hover:text-red-600 disabled:opacity-50"
                  >
                    Cancelar pedido
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
