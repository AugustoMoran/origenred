import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import { useGetMyReturnRequestsQuery } from '../../services/marketplaceApi';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada por vendedor',
  rejected: 'Rechazada',
  refunded: 'Reembolsada',
};

export const MyReturnsPage: React.FC = () => {
  const { data, isLoading } = useGetMyReturnRequestsQuery();
  const requests = data?.requests || [];
  const reasonLabels = data?.reasonLabels || {};

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SEO title="Mis devoluciones — OrigenRed" />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-or-navy">Mis devoluciones</h1>
        <Link to="/cuenta/compras" className="text-sm text-or-blue font-medium hover:underline">
          Mis compras
        </Link>
      </div>

      {isLoading ? (
        <p className="text-slate-400">Cargando...</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-400">No tenés solicitudes de devolución</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(requests as any[]).map((req) => (
            <div key={req._id} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-2">
              <div className="flex justify-between gap-4">
                <Link to={`/cuenta/compras/${req.orderNumber}`} className="font-semibold text-or-navy hover:underline">
                  {req.orderNumber}
                </Link>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {STATUS_LABELS[req.status] || req.status}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                {reasonLabels[req.reason] || req.reason}
              </p>
              {req.description && <p className="text-sm text-slate-500">{req.description}</p>}
              {req.sellerNote && (
                <p className="text-xs text-slate-500">Vendedor: {req.sellerNote}</p>
              )}
              <p className="text-xs text-slate-400">
                {new Date(req.createdAt).toLocaleDateString('es-AR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
