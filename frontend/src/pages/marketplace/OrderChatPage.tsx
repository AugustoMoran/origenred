import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { SEO } from '../../components/ecommerce/SEO';
import {
  useGetChatByOrderQuery,
  useGetConversationMessagesQuery,
  useSendMessageMutation,
} from '../../services/marketplaceApi';
import {
  connectSocket,
  joinChatRoom,
  leaveChatRoom,
  markChatRead,
} from '../../services/socket';
import {
  applyChatReadToMessages,
  chatSenderId,
  ChatReadPayload,
  formatChatReadLabel,
  formatChatTime,
} from '../../utils/chatUi';

type ChatMsg = {
  _id: string;
  body: string;
  createdAt: string;
  readAt?: string;
  pending?: boolean;
  sender?: { _id?: string; id?: string; name?: string } | string;
};

export const OrderChatPage: React.FC = () => {
  const { conversationId, orderNumber } = useParams();
  const location = useLocation();
  const isSellerPanel = location.pathname.startsWith('/vendedor/chat');
  const { user } = useSelector((state: RootState) => state.auth);
  const userId = String(user?.id || (user as { _id?: string })?._id || '');
  const [message, setMessage] = useState('');
  const [liveMessages, setLiveMessages] = useState<ChatMsg[]>([]);
  const [sendError, setSendError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const byOrder = useGetChatByOrderQuery(orderNumber || '', {
    skip: !orderNumber,
    pollingInterval: socketConnected ? 0 : 12_000,
  });
  const byId = useGetConversationMessagesQuery(conversationId || '', {
    skip: !conversationId,
    pollingInterval: socketConnected ? 0 : 12_000,
  });
  const data = orderNumber ? byOrder.data : byId.data;
  const isLoading = orderNumber ? byOrder.isLoading : byId.isLoading;
  const loadError = orderNumber ? byOrder.error : byId.error;

  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();

  const convId = data?.conversation?._id || conversationId;
  const serverMessages = (data?.messages || []) as ChatMsg[];

  const patchMessages = useCallback((updater: (prev: ChatMsg[]) => ChatMsg[]) => {
    setLiveMessages(updater);
  }, []);

  const messages = useMemo(() => {
    const merged = [...serverMessages];
    for (const m of liveMessages) {
      const idx = merged.findIndex((x) => x._id === m._id);
      if (idx >= 0) merged[idx] = { ...merged[idx], ...m };
      else merged.push(m);
    }
    return merged.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [serverMessages, liveMessages]);

  useEffect(() => {
    if (!serverMessages.length) return;
    patchMessages((prev) => {
      const merged = [...serverMessages];
      for (const m of prev) {
        const idx = merged.findIndex((x) => x._id === m._id);
        if (idx >= 0) merged[idx] = { ...merged[idx], ...m };
        else merged.push(m);
      }
      return merged.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, [serverMessages, patchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!convId) return;

    const socket = connectSocket();

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    const onMessage = (msg: ChatMsg) => {
      patchMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
      const fromOther = chatSenderId(msg) !== userId;
      if (fromOther) markChatRead(convId);
    };

    const onRead = (payload: ChatReadPayload) => {
      if (payload.conversationId && payload.conversationId !== convId) return;
      patchMessages((prev) => applyChatReadToMessages(prev, payload));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat:message', onMessage);
    socket.on('chat:read', onRead);

    if (socket.connected) setSocketConnected(true);
    joinChatRoom(convId);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat:message', onMessage);
      socket.off('chat:read', onRead);
      leaveChatRoom(convId);
    };
  }, [convId, patchMessages, userId]);

  const handleSend = async () => {
    setSendError('');
    const text = message.trim();
    if (!text) return;
    if (!convId) {
      setSendError('No se pudo abrir la conversación. Recargá la página o volvé a Mis compras.');
      return;
    }

    const tempId = `pending-${Date.now()}`;
    const optimistic: ChatMsg = {
      _id: tempId,
      body: text,
      createdAt: new Date().toISOString(),
      pending: true,
      sender: { _id: userId, name: user?.name },
    };
    setMessage('');
    patchMessages((prev) => [...prev, optimistic]);

    try {
      const sent = (await sendMessage({ conversationId: convId, body: text }).unwrap()) as ChatMsg;
      patchMessages((prev) =>
        prev
          .filter((m) => m._id !== tempId)
          .concat(sent)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      );
    } catch (err: any) {
      patchMessages((prev) => prev.filter((m) => m._id !== tempId));
      setMessage(text);
      setSendError(err?.data?.message || 'No se pudo enviar el mensaje. Intentá de nuevo.');
    }
  };

  const backHref = isSellerPanel ? '/vendedor/ventas' : '/cuenta/compras';
  const backLabel = isSellerPanel ? 'Mis ventas' : 'Mis compras';

  if (isLoading) {
    return <div className="py-20 text-center text-slate-400">Cargando chat...</div>;
  }

  if (loadError && !convId) {
    const errMsg =
      (loadError as { data?: { message?: string } })?.data?.message ||
      'No se pudo cargar el chat';
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <p className="text-red-600 text-sm">{errMsg}</p>
        <Link to={backHref} className="text-or-blue font-medium hover:underline">
          ← {backLabel}
        </Link>
      </div>
    );
  }

  const order = data?.conversation?.order as { orderNumber?: string } | undefined;

  return (
    <div
      className="marketplace-theme flex flex-col w-full max-w-2xl mx-auto fixed inset-0 h-[100dvh] md:relative md:inset-auto md:h-[calc(100dvh-8rem)] md:max-h-[720px] z-[60] bg-slate-50 md:rounded-2xl md:border md:border-slate-200 md:shadow-sm"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <SEO title="Chat — OrigenRed" />

      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link to={backHref} className="text-slate-500 hover:text-or-navy text-sm shrink-0">
          ← {backLabel}
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-or-navy text-sm truncate">
            Pedido {order?.orderNumber || orderNumber}
          </p>
          <p className="text-xs text-slate-500">
            Chat con {isSellerPanel ? 'comprador' : 'vendedor'}
            {!socketConnected && ' · reconectando…'}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 px-3 py-4 space-y-3 overscroll-contain">
        {!messages.length && (
          <p className="text-center text-slate-500 text-sm py-8">Escribí el primer mensaje</p>
        )}
        {messages.map((msg) => {
          const isMine = chatSenderId(msg) === userId;
          const readLabel = isMine ? formatChatReadLabel(msg.readAt) : null;
          return (
            <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] sm:max-w-[75%] px-3 py-2 rounded-2xl text-sm break-words ${
                  isMine
                    ? 'bg-or-blue text-white rounded-br-sm'
                    : 'bg-white border border-slate-200 text-or-navy rounded-bl-sm'
                } ${msg.pending ? 'opacity-80' : ''}`}
              >
                {!isMine && (
                  <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                    {typeof msg.sender === 'object' ? msg.sender?.name || 'Usuario' : 'Usuario'}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{msg.body}</p>
                <div
                  className={`flex items-center gap-2 justify-end mt-1 text-[10px] ${
                    isMine ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  <span>{formatChatTime(msg.createdAt)}</span>
                  {readLabel && <span className="font-medium">{readLabel}</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="shrink-0 bg-white border-t border-slate-200 px-3 py-3 flex gap-2 items-end pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribí un mensaje..."
          className="marketplace-field flex-1 min-w-0 px-3 py-2.5 text-base sm:text-sm"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="shrink-0 px-4 py-2.5 bg-or-red text-white font-semibold rounded-xl hover:bg-red-600 disabled:opacity-50 text-sm touch-manipulation"
        >
          Enviar
        </button>
      </form>
      {sendError && (
        <p className="shrink-0 px-4 pb-2 text-xs text-red-600 bg-white">{sendError}</p>
      )}
    </div>
  );
};
