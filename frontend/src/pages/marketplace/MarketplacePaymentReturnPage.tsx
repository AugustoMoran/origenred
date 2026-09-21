import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { SEO } from '../../components/ecommerce/SEO';
import { clearMarketplaceCart } from '../../store/marketplaceCartSlice';
import { useConfirmCheckoutReturnMutation } from '../../services/marketplaceApi';

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
    description: 'Tu carrito sigue guardado. Podés volver a /comprar e intentar de nuevo.',
  },
  pending: {
    emoji: '⏳',
    title: 'Pago pendiente',
    description: 'Mercado Pago está procesando tu pago. Te avisaremos cuando se confirme.',
  },
};

export const MarketplacePaymentReturnPage: React.FC<{ kind: PaymentReturnKind }> = ({ kind }) => {
  const dispatch = useDispatch();
  const [params] = useSearchParams();
  const orderNumber = params.get('orderNumber') || params.get('external_reference') || '';
  const paymentId = params.get('payment_id') || params.get('collection_id') || '';
  const [confirmReturn] = useConfirmCheckoutReturnMutation();
  const [syncNote, setSyncNote] = useState('');
  const { emoji, title, description } = config[kind];

  useEffect(() => {
    if (kind !== 'success') return;
    dispatch(clearMarketplaceCart());
    if (!paymentId) return;
    confirmReturn(paymentId)
      .unwrap()
      .then(() => setSyncNote(''))
      .catch(() => setSyncNote('Si el pedido no aparece actualizado, esperá unos minutos o contactá soporte.'));
  }, [kind, dispatch, paymentId, confirmReturn]);

  return (
    <div className="max-w-lg mx-auto text-center py-12 space-y-6">
      <SEO title={title} />
      <div className="text-5xl">{emoji}</div>
      <h1 className="text-2xl font-bold text-or-navy">{title}</h1>
      <p className="text-slate-500 text-sm">{description}</p>
      {syncNote && <p className="text-xs text-amber-700">{syncNote}</p>}
      {kind === 'success' && !orderNumber && (
        <p className="text-xs text-slate-500">
          Si compraste sin cuenta, revisá tu email para el enlace de seguimiento del pedido.
        </p>
      )}
      {orderNumber && (
        <p className="text-sm text-slate-400">
          Referencia: <span className="font-mono text-or-navy">{orderNumber}</span>
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {orderNumber && kind === 'success' && (
          <>
            <Link
              to={`/cuenta/compras/${orderNumber}`}
              className="px-5 py-2.5 bg-or-red text-white font-semibold rounded-xl hover:bg-red-600"
            >
              Ver pedido (con cuenta)
            </Link>
            <Link
              to="/registro"
              className="px-5 py-2.5 border border-or-blue text-or-blue font-semibold rounded-xl hover:bg-blue-50"
            >
              Crear cuenta
            </Link>
          </>
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
