import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import { useGetGuestOrderTrackQuery } from '../../services/marketplaceApi';
import { PickupLocationCard } from '../../components/marketplace/PickupLocationCard';
import { shipFromFromOrderRow } from '../../utils/orderPickup';

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const GuestOrderTrackingPage: React.FC = () => {
  const { orderNumber = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const { data: order, isLoading, error } = useGetGuestOrderTrackQuery(
    { orderNumber, token },
    { skip: !orderNumber || !token }
  );

  if (!token) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center text-slate-500">
        Enlace de seguimiento inválido. Revisá el mail de confirmación o contactá al vendedor.
      </div>
    );
  }

  if (isLoading) return <div className="py-20 text-center text-slate-400">Cargando pedido...</div>;
  if (error || !order) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center text-slate-500">
        No encontramos este pedido. El enlace puede haber expirado.
      </div>
    );
  }

  const registerHref = order.guestEmail
    ? `/registro?email=${encodeURIComponent(order.guestEmail)}`
    : '/registro';

  return (
    <div className="max-w-lg mx-auto py-10 space-y-6">
      <SEO title={`Pedido ${order.orderNumber}`} />
      <h1 className="text-2xl font-bold text-or-navy">Tu pedido</h1>
      <p className="text-sm text-slate-500">
        Número: <strong className="text-or-navy font-mono">{order.orderNumber}</strong>
      </p>
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Estado</span>
          <span className="font-medium capitalize">{order.status.replace('_', ' ')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Total</span>
          <span className="font-bold text-or-navy">{format(order.total)}</span>
        </div>
        {order.items?.map((item, idx) => (
          <div key={idx} className="flex justify-between text-slate-600 pt-1">
            <span>{item.title} ×{item.quantity}</span>
            <span>{format(item.subtotal)}</span>
          </div>
        ))}
      </div>

      {order.shippingMethod === 'pickup' && order.shippingBySeller?.length > 0 && (
        <div className="space-y-3">
          {(order.shippingBySeller as any[]).map((row) => (
            <PickupLocationCard
              key={String(row.seller)}
              sellerName={row.sellerName || 'Vendedor'}
              shipFrom={shipFromFromOrderRow(row)}
            />
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-3 text-sm text-or-navy">
        <p className="font-semibold">Creá tu cuenta para chatear con el vendedor</p>
        <p className="text-slate-600">
          Registrate con el mismo email que usaste en la compra y vas a ver este pedido en Mis compras, con chat incluido.
        </p>
        <Link
          to={registerHref}
          className="inline-block px-5 py-2.5 bg-or-red text-white font-semibold rounded-xl hover:bg-red-600"
        >
          Crear cuenta
        </Link>
        {order.chatEnabled && (
          <p className="text-xs text-slate-500">
            Ya tenés cuenta?{' '}
            <Link to="/login" className="text-or-blue font-medium hover:underline">
              Iniciá sesión
            </Link>
          </p>
        )}
      </div>

      <Link to="/" className="text-or-red text-sm font-medium hover:underline">
        Volver al marketplace
      </Link>
    </div>
  );
};
