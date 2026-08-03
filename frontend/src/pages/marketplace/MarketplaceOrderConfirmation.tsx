import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import { useGetOrderQuery } from '../../services/marketplaceApi';

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const MarketplaceOrderConfirmation: React.FC = () => {
  const { orderNumber = '' } = useParams();
  const { data: order, isLoading } = useGetOrderQuery(orderNumber, { skip: !orderNumber });

  if (isLoading) return <div className="py-20 text-center text-slate-400">Cargando pedido...</div>;
  if (!order) return <div className="py-20 text-center text-slate-400">Pedido no encontrado</div>;

  const isPaid = order.status === 'paid';

  return (
    <div className="max-w-lg mx-auto text-center py-12 space-y-6">
      <SEO title={`Pedido ${order.orderNumber}`} />
      <div className="text-5xl">{isPaid ? '✅' : '⏳'}</div>
      <h1 className="text-2xl font-bold text-or-navy">
        {isPaid ? '¡Compra confirmada!' : 'Pedido registrado'}
      </h1>
      <p className="text-slate-500">
        Número de pedido: <strong className="text-or-navy">{order.orderNumber}</strong>
      </p>
      <div className="bg-white rounded-2xl border border-slate-100 p-6 text-left space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Total</span>
          <span className="font-bold text-or-navy">{format(order.total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Estado</span>
          <span className="font-medium capitalize">{order.status.replace('_', ' ')}</span>
        </div>
        {order.items?.map((item: any) => (
          <div key={item.listing} className="flex justify-between text-sm text-slate-600 pt-1">
            <span>{item.title} ×{item.quantity}</span>
            <span>{format(item.subtotal)}</span>
          </div>
        ))}
      </div>
      {isPaid && order.chatEnabled && (
        <p className="text-sm text-or-blue">Podés chatear con el vendedor desde Mis compras</p>
      )}
      <Link to="/" className="inline-block text-or-red font-medium hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
};
