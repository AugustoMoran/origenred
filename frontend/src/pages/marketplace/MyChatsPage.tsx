import React from 'react';
import { Link } from 'react-router-dom';
import { useGetMyConversationsQuery } from '../../services/marketplaceApi';

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const MyChatsPage: React.FC = () => {
  const { data: conversations = [], isLoading } = useGetMyConversationsQuery();

  if (isLoading) {
    return <div className="py-20 text-center text-slate-400">Cargando mensajes...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <h1 className="text-2xl font-bold text-or-navy">Mis mensajes</h1>

      {conversations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500 text-sm">
          No tenés conversaciones activas. El chat se habilita después de comprar.
        </div>
      ) : (
        <ul className="space-y-3">
          {conversations.map((conv: any) => {
            const order = conv.order;
            const orderNumber = order?.orderNumber;
            const seller = conv.seller;
            const buyer = conv.buyer;
            const label = seller?.businessName || buyer?.name || 'Conversación';
            const unread = conv.unreadCount || 0;

            return (
              <li key={conv._id}>
                <Link
                  to={orderNumber ? `/cuenta/chat/${orderNumber}` : '#'}
                  className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 px-5 py-4 hover:border-or-blue/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-or-navy truncate">{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pedido {orderNumber} · {order?.status?.replace('_', ' ')}
                      {order?.total ? ` · ${format(order.total)}` : ''}
                    </p>
                  </div>
                  {unread > 0 && (
                    <span className="ml-3 min-w-[24px] h-6 px-2 rounded-full bg-or-red text-white text-xs font-bold flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
