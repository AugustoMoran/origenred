import React, { useState } from 'react';
import {
  useGetAdminServiceLeadsQuery,
  useUpdateAdminServiceLeadMutation,
} from '../../services/marketplaceApi';

const STATUS_LABELS: Record<string, string> = {
  new: 'Nueva',
  contacted: 'Contactado',
  closed: 'Cerrado',
};

export const AdminMarketplaceServiceLeads: React.FC = () => {
  const [tab, setTab] = useState<'new' | 'all'>('new');
  const { data, isLoading, refetch } = useGetAdminServiceLeadsQuery(
    tab === 'new' ? { status: 'new' } : { status: 'all' }
  );
  const [updateLead, { isLoading: updating }] = useUpdateAdminServiceLeadMutation();
  const leads = data?.leads || [];
  const labels = data?.labels || {};

  const handle = async (id: string, status: 'contacted' | 'closed') => {
    await updateLead({ id, status });
    refetch();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Servicios OrigenRed</h1>
          <p className="text-sm text-slate-500 mt-1">Solicitudes de asesoramiento de vendedores</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('new')}
            className={`px-4 py-2 text-sm rounded-xl font-medium ${tab === 'new' ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400'}`}
          >
            Nuevas
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
      ) : leads.length === 0 ? (
        <p className="text-slate-500">Sin solicitudes</p>
      ) : (
        <div className="space-y-4">
          {(leads as any[]).map((lead) => (
            <div key={lead._id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between gap-4">
                <span className="font-semibold text-white">
                  {labels[lead.serviceType] || lead.serviceType}
                </span>
                <span className="text-xs text-slate-400">{STATUS_LABELS[lead.status] || lead.status}</span>
              </div>
              <p className="text-sm text-slate-300">
                {lead.seller?.businessName || 'Vendedor'} — {lead.user?.name || ''} ({lead.user?.email || ''})
              </p>
              {lead.message && <p className="text-sm text-slate-400">{lead.message}</p>}
              {lead.seller?.phone && (
                <p className="text-xs text-slate-500">Tel: {lead.seller.phone}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {lead.status === 'new' && (
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handle(lead._id, 'contacted')}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg"
                  >
                    Marcar contactado
                  </button>
                )}
                {lead.status !== 'closed' && (
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handle(lead._id, 'closed')}
                    className="px-3 py-1.5 text-xs bg-white/10 text-slate-300 rounded-lg"
                  >
                    Cerrar
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
