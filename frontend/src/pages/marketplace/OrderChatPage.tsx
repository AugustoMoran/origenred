import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { SEO } from '../../components/ecommerce/SEO';
import {
  useGetChatByOrderQuery,
  useGetConversationMessagesQuery,
  useSendMessageMutation,
} from '../../services/marketplaceApi';

export const OrderChatPage: React.FC = () => {
  const { conversationId, orderNumber } = useParams();
  const { user } = useSelector((state: RootState) => state.auth);
  const [message, setMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const byOrder = useGetChatByOrderQuery(orderNumber || '', { skip: !orderNumber });
  const byId = useGetConversationMessagesQuery(conversationId || '', { skip: !conversationId });
  const data = orderNumber ? byOrder.data : byId.data;
  const isLoading = orderNumber ? byOrder.isLoading : byId.isLoading;
  const refetch = orderNumber ? byOrder.refetch : byId.refetch;

  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();

  const convId = data?.conversation?._id || conversationId;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  // Poll cada 5s para nuevos mensajes
  useEffect(() => {
    const interval = setInterval(() => refetch(), 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !convId) return;
    await sendMessage({ conversationId: convId, body: message.trim() });
    setMessage('');
    refetch();
  };

  if (isLoading) return <div className="py-20 text-center text-slate-400">Cargando chat...</div>;

  const order = data?.conversation?.order as any;

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-12rem)]">
      <SEO title="Chat — OrigenRed" />

      <div className="bg-white rounded-t-2xl border border-slate-100 px-5 py-4 flex items-center gap-3">
        <Link to="/cuenta/compras" className="text-slate-400 hover:text-or-navy text-sm">← Volver</Link>
        <div className="flex-1">
          <p className="font-semibold text-or-navy text-sm">
            Pedido {order?.orderNumber || orderNumber}
          </p>
          <p className="text-xs text-slate-400">Chat post-compra</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 border-x border-slate-100 px-4 py-4 space-y-3">
        {!data?.messages?.length && (
          <p className="text-center text-slate-400 text-sm py-8">
            Iniciá la conversación con el vendedor
          </p>
        )}
        {data?.messages?.map((msg: any) => {
          const isMine = String(msg.sender?._id || msg.sender) === String(user?._id);
          return (
            <div
              key={msg._id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMine
                    ? 'bg-or-blue text-white rounded-br-sm'
                    : 'bg-white border border-slate-200 text-or-navy rounded-bl-sm'
                }`}
              >
                {!isMine && (
                  <p className="text-[10px] font-semibold mb-1 opacity-60">
                    {msg.sender?.name || 'Usuario'}
                  </p>
                )}
                <p>{msg.body}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="bg-white rounded-b-2xl border border-slate-100 px-4 py-3 flex gap-2"
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribí un mensaje..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-or-blue"
        />
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="px-5 py-2.5 bg-or-red text-white font-semibold rounded-xl hover:bg-red-600 disabled:opacity-50 text-sm"
        >
          Enviar
        </button>
      </form>
    </div>
  );
};
