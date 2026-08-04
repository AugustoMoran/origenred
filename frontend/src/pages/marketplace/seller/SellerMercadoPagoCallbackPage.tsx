import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCompleteMercadoPagoConnectMutation } from '../../../services/marketplaceApi';

export const SellerMercadoPagoCallbackPage: React.FC = () => {
  const [params] = useSearchParams();
  const [completeConnect] = useCompleteMercadoPagoConnectMutation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');

    if (!code) {
      setStatus('error');
      setMessage('No recibimos el código de autorización de Mercado Pago.');
      return;
    }

    completeConnect({ code, state: state || undefined })
      .unwrap()
      .then(() => {
        setStatus('success');
        setMessage('Tu cuenta de Mercado Pago fue vinculada correctamente.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err?.data?.message || 'No se pudo completar la vinculación.');
      });
  }, [params, completeConnect]);

  return (
    <div className="max-w-lg mx-auto py-16 text-center space-y-4">
      {status === 'loading' && (
        <>
          <div className="text-4xl">⏳</div>
          <h1 className="text-xl font-bold text-or-navy">Vinculando Mercado Pago...</h1>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="text-4xl">✅</div>
          <h1 className="text-xl font-bold text-or-navy">¡Listo!</h1>
          <p className="text-slate-500 text-sm">{message}</p>
          <Link to="/vendedor/mercadopago" className="text-or-red font-medium hover:underline">
            Volver a Mercado Pago
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-bold text-or-navy">Error al vincular</h1>
          <p className="text-slate-500 text-sm">{message}</p>
          <Link to="/vendedor/mercadopago" className="text-or-red font-medium hover:underline">
            Intentar de nuevo
          </Link>
        </>
      )}
    </div>
  );
};
