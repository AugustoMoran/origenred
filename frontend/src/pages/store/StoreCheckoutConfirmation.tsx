import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import { useGetStoreOrderQuery } from '../../services/ecommerceApi';
import { useTrackEventMutation } from '../../services/analyticsApi';

export const StoreCheckoutConfirmation: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading, isError } = useGetStoreOrderQuery(orderId || '', { skip: !orderId });
  const [trackEvent] = useTrackEventMutation();

  useEffect(() => {
    if (orderId) {
      trackEvent({ event: 'order_confirmation', metadata: { orderId } }).catch(() => {});
    }
  }, [orderId, trackEvent]);

  if (isLoading) {
    return <div className="text-slate-500 text-sm py-20 text-center">Cargando confirmación...</div>;
  }

  if (isError || !order) {
    return (
      <div className="card p-12 text-center space-y-4 max-w-lg mx-auto">
        <p className="text-slate-400">No se pudo cargar la confirmación del pedido.</p>
        <Link to="/" className="btn-primary inline-flex">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-slide-up text-center">
      <SEO title="Pedido confirmado" description="Tu pedido fue registrado correctamente" />

      <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">¡Pedido confirmado!</h1>
        <p className="text-slate-400 mt-2">
          Recibimos tu pedido y te contactaremos a la brevedad.
        </p>
      </div>

      <div className="card p-6 text-left space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Nº de pedido</span>
          <span className="font-mono text-brand-400">{order.orderNumber || order._id?.slice(-8).toUpperCase()}</span>
        </div>
        {order.customerName && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Cliente</span>
            <span className="text-white">{order.customerName}</span>
          </div>
        )}
        {order.total != null && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total</span>
            <span className="font-bold text-white tabular-nums">
              ${Number(order.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        {order.status && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Estado</span>
            <span className="badge-blue capitalize">{order.status}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/" className="btn-primary">Volver al inicio</Link>
        <Link to="/products" className="btn-secondary">Seguir comprando</Link>
      </div>
    </div>
  );
};
