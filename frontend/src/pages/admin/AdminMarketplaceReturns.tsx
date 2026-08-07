import React, { useState } from 'react';
import {
  useGetAdminReturnRequestsQuery,
  useUpdateAdminReturnMutation,
} from '../../services/marketplaceApi';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  refunded: 'Reembolsada',
};

export const AdminMarketplaceReturns: React.FC = () => {
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const { data, isLoading, refetch } = useGetAdminReturnRequestsQuery(
    tab === 'pending' ? { status: 'pending' } : { status: 'all' }
  );
  const [updateReturn, { isLoading: updating }] = useUpdateAdminReturnMutation();
  const requests = data?.requests || [];
  const reasonLabels = data?.reasonLabels || {};

  const handle = async (id: string, status: 'approved' | 'rejected' | 'refunded') => {
    await updateReturn({ id, status });
    refetch();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Devoluciones marketplace</h1>
          <p className="text-sm text-slate-500 mt-1">Solicitudes de compradores</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2 text-sm rounded-xl font-medium ${tab === 'pending' ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400'}`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-2 text-sm rounded-xl font-medium ${tab === 'all' ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400'}`}
          >
            Todas
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : requests.length === 0 ? (
        <p className="text-slate-500">Sin solicitudes</p>
      ) : (
        <div className="space-y-4">
          {(requests as any[]).map((req) => (
            <div key={req._id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between gap-4">
                <span className="font-semibold text-white">{req.orderNumber}</span>
                <span className="text-xs text-slate-400">{STATUS_LABELS[req.status] || req.status}</span>
              </div>
              <p className="text-sm text-slate-300">{reasonLabels[req.reason] || req.reason}</p>
              {req.description && <p className="text-sm text-slate-400">{req.description}</p>}
              <div className="flex flex-wrap gap-2 pt-2">
                {req.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handle(req._id, 'approved')}
                      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handle(req._id, 'rejected')}
                      className="px-3 py-1.5 text-xs bg-white/10 text-slate-300 rounded-lg"
                    >
                      Rechazar
                    </button>
                  </>
                )}
                {req.status === 'approved' && (
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handle(req._id, 'refunded')}
                    className="px-3 py-1.5 text-xs bg-or-red text-white rounded-lg"
                  >
                    Marcar reembolsado
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
