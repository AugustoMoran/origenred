import React, { useState } from 'react';
import { useGetReportsQuery, useResolveReportMutation } from '../../services/marketplaceApi';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  reviewing: 'En revisión',
  resolved: 'Resuelta',
  dismissed: 'Desestimada',
};

export const AdminMarketplaceReports: React.FC = () => {
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const { data, isLoading, refetch } = useGetReportsQuery(
    tab === 'pending' ? { status: 'pending' } : { status: 'all' }
  );
  const [resolveReport, { isLoading: resolving }] = useResolveReportMutation();

  const reports = data?.reports || [];

  const handleResolve = async (id: string, status: string, resolution?: string) => {
    await resolveReport({ id, status, resolution });
    refetch();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Denuncias</h1>
          <p className="text-sm text-slate-500 mt-1">Moderación de productos y vendedores</p>
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
      ) : reports.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No hay denuncias</div>
      ) : (
        <div className="space-y-3">
          {reports.map((report: any) => (
            <div key={report._id} className="card p-5 space-y-3">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="badge-yellow">{STATUS_LABELS[report.status] || report.status}</span>
                  <p className="font-medium text-white mt-2">
                    {data?.reasonLabels?.[report.reason] || report.reason}
                  </p>
                  {report.listing && (
                    <p className="text-sm text-slate-400">
                      Producto: {report.listing.title}
                      {report.listing.status === 'moderated' && (
                        <span className="ml-2 text-amber-400">(moderado)</span>
                      )}
                    </p>
                  )}
                  {report.description && (
                    <p className="text-sm text-slate-500 mt-1">{report.description}</p>
                  )}
                  <p className="text-xs text-slate-600 mt-1">
                    Por {report.reporter?.name || report.reporter?.email} ·{' '}
                    {new Date(report.createdAt).toLocaleDateString('es-AR')}
                  </p>
                </div>
                {report.status === 'pending' && (
                  <div className="flex flex-col gap-2 text-xs">
                    <button
                      disabled={resolving}
                      onClick={() => handleResolve(report._id, 'resolved', 'Producto moderado')}
                      className="text-emerald-400 hover:underline disabled:opacity-50"
                    >
                      Resolver (mantener moderado)
                    </button>
                    <button
                      disabled={resolving}
                      onClick={() => handleResolve(report._id, 'dismissed', 'Denuncia desestimada')}
                      className="text-slate-400 hover:underline disabled:opacity-50"
                    >
                      Desestimar (reactivar producto)
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
