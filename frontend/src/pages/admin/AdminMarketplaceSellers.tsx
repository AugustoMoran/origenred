import React, { useState } from 'react';
import {
  useGetPendingSellersQuery,
  useGetAllSellersQuery,
  useUpdateSellerStatusMutation,
  useReindexMarketplaceListingsMutation,
} from '../../services/marketplaceApi';

export const AdminMarketplaceSellers: React.FC = () => {
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const { data: pending = [], refetch: refetchPending } = useGetPendingSellersQuery();
  const { data: all = [], refetch: refetchAll } = useGetAllSellersQuery(undefined, { skip: tab !== 'all' });
  const [updateStatus, { isLoading }] = useUpdateSellerStatusMutation();
  const [reindex, { isLoading: reindexing }] = useReindexMarketplaceListingsMutation();
  const [reindexMsg, setReindexMsg] = useState('');

  const sellers = tab === 'pending' ? pending : all;

  const handleStatus = async (id: string, status: string, rejectionReason?: string) => {
    await updateStatus({ id, status, rejectionReason });
    refetchPending();
    refetchAll();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vendedores Marketplace</h1>
          <p className="text-sm text-slate-500 mt-1">Aprobación manual de vendedores terceros</p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            type="button"
            disabled={reindexing}
            onClick={async () => {
              setReindexMsg('');
              try {
                const result = await reindex().unwrap();
                setReindexMsg(`Reindexados: ${result.indexed ?? 0} productos`);
              } catch {
                setReindexMsg('Error al reindexar búsqueda');
              }
            }}
            className="px-4 py-2 text-sm rounded-xl font-medium bg-white/5 text-slate-300 hover:text-white disabled:opacity-50"
          >
            {reindexing ? 'Reindexando...' : 'Reindexar búsqueda'}
          </button>
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2 text-sm rounded-xl font-medium transition-colors ${
              tab === 'pending' ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Pendientes ({pending.length})
          </button>
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-2 text-sm rounded-xl font-medium transition-colors ${
              tab === 'all' ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Todos
          </button>
        </div>
      </div>

      {reindexMsg && (
        <p className="text-sm text-slate-400">{reindexMsg}</p>
      )}

      {sellers.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          {tab === 'pending' ? 'No hay vendedores pendientes' : 'No hay vendedores registrados'}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Negocio</th>
                <th className="text-left px-4 py-3">Contacto</th>
                <th className="text-left px-4 py-3">Ubicación</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sellers.map((seller: any) => (
                <tr key={seller._id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{seller.businessName}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{seller.description}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    <p>{seller.user?.name}</p>
                    <p className="text-xs">{seller.user?.email}</p>
                    {seller.phone && <p className="text-xs">{seller.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {[seller.city, seller.province].filter(Boolean).join(', ')}
                    {seller.postalCode && <p>CP: {seller.postalCode}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={seller.status} />
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {seller.status === 'pending' && (
                      <>
                        <button
                          disabled={isLoading}
                          onClick={() => handleStatus(seller._id, 'approved')}
                          className="text-xs text-emerald-400 hover:underline disabled:opacity-50"
                        >
                          Aprobar
                        </button>
                        <button
                          disabled={isLoading}
                          onClick={() => {
                            const reason = prompt('Motivo del rechazo (opcional):');
                            handleStatus(seller._id, 'rejected', reason || undefined);
                          }}
                          className="text-xs text-red-400 hover:underline disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                    {seller.status === 'approved' && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleStatus(seller._id, 'suspended')}
                        className="text-xs text-amber-400 hover:underline disabled:opacity-50"
                      >
                        Suspender
                      </button>
                    )}
                    {seller.status === 'suspended' && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleStatus(seller._id, 'approved')}
                        className="text-xs text-emerald-400 hover:underline disabled:opacity-50"
                      >
                        Reactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    pending: 'badge-yellow',
    approved: 'badge-green',
    suspended: 'badge-red',
    rejected: 'badge-red',
  };
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    approved: 'Aprobado',
    suspended: 'Suspendido',
    rejected: 'Rechazado',
  };
  return <span className={map[status] || 'badge'}>{labels[status] || status}</span>;
};
