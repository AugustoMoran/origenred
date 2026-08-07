import React from 'react';
import {
  useGetSellerReturnRequestsQuery,
  useUpdateSellerReturnMutation,
} from '../../../services/marketplaceApi';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  refunded: 'Reembolsada',
};

export const SellerReturnsPage: React.FC = () => {
  const { data, isLoading, refetch } = useGetSellerReturnRequestsQuery();
  const [updateReturn, { isLoading: updating }] = useUpdateSellerReturnMutation();
  const requests = data?.requests || [];
  const reasonLabels = data?.reasonLabels || {};

  const handle = async (id: string, status: 'approved' | 'rejected') => {
    await updateReturn({ id, status });
    refetch();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-or-navy">Devoluciones</h2>

      {isLoading ? (
        <p className="text-slate-400">Cargando...</p>
      ) : requests.length === 0 ? (
        <p className="text-slate-400">No hay solicitudes de devolución</p>
      ) : (
        <div className="space-y-4">
          {(requests as any[]).map((req) => (
            <div key={req._id} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
              <div className="flex justify-between gap-4">
                <span className="font-semibold text-or-navy">{req.orderNumber}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100">
                  {STATUS_LABELS[req.status] || req.status}
                </span>
              </div>
              <p className="text-sm text-slate-600">{reasonLabels[req.reason] || req.reason}</p>
              {req.description && <p className="text-sm text-slate-500">{req.description}</p>}
              {(req.buyer as any)?.name && (
                <p className="text-xs text-slate-400">Comprador: {(req.buyer as any).name}</p>
              )}
              {req.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handle(req._id, 'approved')}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-xl disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handle(req._id, 'rejected')}
                    className="px-4 py-2 text-sm border border-slate-200 rounded-xl disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
