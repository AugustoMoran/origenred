import React from 'react';
import {
  useGetAdminEnvioPackProofsQuery,
  useConfirmAdminEnvioPackProofMutation,
} from '../../services/marketplaceApi';

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const AdminEnvioPackProofs: React.FC = () => {
  const { data: rows = [], refetch, isLoading } = useGetAdminEnvioPackProofsQuery();
  const [confirm, { isLoading: confirming }] = useConfirmAdminEnvioPackProofMutation();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Comprobantes EnvíoPack</h1>
        <p className="text-sm text-slate-500 mt-1">
          El vendedor transfiere a EnvíoPack y sube el comprobante. Descargalo y cargalo en el panel de EnvíoPack →
          Cargar crédito.
        </p>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No hay comprobantes todavía</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Pedido</th>
                <th className="text-left px-4 py-3">Vendedor</th>
                <th className="text-left px-4 py-3">Monto envío</th>
                <th className="text-left px-4 py-3">Comprobante</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((row) => (
                <tr key={row.orderNumber} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-white">{row.orderNumber}</td>
                  <td className="px-4 py-3 text-slate-400">{row.sellerName}</td>
                  <td className="px-4 py-3 text-slate-300">{format(row.shippingCost)}</td>
                  <td className="px-4 py-3">
                    {row.proofUrl ? (
                      <a
                        href={row.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-400 hover:underline"
                      >
                        {row.proofFileName || 'Ver archivo'}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{row.proofStatus}</td>
                  <td className="px-4 py-3 text-right">
                    {row.proofStatus === 'uploaded' && (
                      <button
                        type="button"
                        disabled={confirming}
                        onClick={async () => {
                          await confirm(row.orderNumber);
                          refetch();
                        }}
                        className="text-xs text-emerald-400 hover:underline disabled:opacity-50"
                      >
                        Marcar cargado en EP
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
