import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import {
  useGetNotificationSummaryQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../../services/marketplaceApi';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const NotificationsPage: React.FC = () => {
  const { data, isLoading, refetch } = useGetNotificationSummaryQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();

  const items = data?.items || [];

  const handleClick = async (id: string, unread?: boolean) => {
    if (unread && id.startsWith('persisted-')) {
      try {
        await markRead(id).unwrap();
      } catch {
        refetch();
      }
    }
  };

  const handleMarkAll = async () => {
    await markAll().unwrap();
    refetch();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SEO title="Notificaciones — OrigenRed" />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-or-navy">Notificaciones</h1>
        <div className="flex gap-3">
          {items.some((i) => i.unread && i.id.startsWith('persisted-')) && (
            <button
              type="button"
              disabled={markingAll}
              onClick={handleMarkAll}
              className="text-sm text-slate-500 hover:text-or-navy"
            >
              Marcar todas leídas
            </button>
          )}
          <Link to="/cuenta/mensajes" className="text-sm text-or-blue font-medium hover:underline">
            Ver mensajes
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate-400">Cargando...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-400">No hay notificaciones recientes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              onClick={() => handleClick(item.id, item.unread)}
              className={`block bg-white rounded-2xl border p-4 transition-colors hover:border-or-blue/30 ${
                item.unread ? 'border-or-red/30 bg-red-50/30' : 'border-slate-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-or-navy text-sm">{item.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{item.body}</p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{formatDate(item.at)}</span>
              </div>
              {item.unread && (
                <span className="text-[10px] font-bold text-or-red mt-2 inline-block">Nuevo</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
