import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';

type PaymentReturnKind = 'success' | 'failure' | 'pending';

const config: Record<
  PaymentReturnKind,
  { emoji: string; title: string; description: string }
> = {
  success: {
    emoji: '✅',
    title: '¡Pago recibido!',
    description: 'Tu compra fue procesada. Revisá Mis compras para ver el estado del pedido.',
  },
  failure: {
    emoji: '❌',
    title: 'El pago no se completó',
    description: 'Podés intentar de nuevo desde el carrito o elegir otro método de pago.',
  },
  pending: {
    emoji: '⏳',
    title: 'Pago pendiente',
    description: 'Mercado Pago está procesando tu pago. Te avisaremos cuando se confirme.',
  },
};

export const MarketplacePaymentReturnPage: React.FC<{ kind: PaymentReturnKind }> = ({ kind }) => {
  const [params] = useSearchParams();
  const orderNumber = params.get('external_reference') || params.get('orderNumber') || '';
  const { emoji, title, description } = config[kind];

  return (
    <div className="max-w-lg mx-auto text-center py-12 space-y-6">
      <SEO title={title} />
      <div className="text-5xl">{emoji}</div>
      <h1 className="text-2xl font-bold text-or-navy">{title}</h1>
      <p className="text-slate-500 text-sm">{description}</p>
      {orderNumber && (
        <p className="text-sm text-slate-400">
          Referencia: <span className="font-mono text-or-navy">{orderNumber}</span>
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {orderNumber && kind === 'success' && (
          <Link
            to={`/cuenta/compras/${orderNumber}`}
            className="px-5 py-2.5 bg-or-red text-white font-semibold rounded-xl hover:bg-red-600"
          >
            Ver pedido
          </Link>
        )}
        <Link to="/" className="px-5 py-2.5 text-or-red font-medium hover:underline">
          Volver al inicio
        </Link>
        {kind === 'failure' && (
          <Link to="/comprar" className="px-5 py-2.5 text-or-blue font-medium hover:underline">
            Reintentar compra
          </Link>
        )}
      </div>
    </div>
  );
};
