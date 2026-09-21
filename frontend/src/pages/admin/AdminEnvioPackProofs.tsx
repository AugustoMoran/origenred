import React, { useMemo, useState } from 'react';
import {
  useGetAdminEnvioPackProofsQuery,
  useConfirmAdminEnvioPackProofMutation,
} from '../../services/marketplaceApi';

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

const STATUS_LABEL: Record<string, string> = {
  pending_transfer: 'Esperando transferencia',
  uploaded: 'Comprobante subido',
  confirmed: 'Crédito cargado en EP',
  platform_ship: 'Venta OrigenRed (auto)',
};

export const AdminEnvioPackProofs: React.FC = () => {
  const { data: rows = [], refetch, isLoading } = useGetAdminEnvioPackProofsQuery(undefined, {
    pollingInterval: 60_000,
  });
  const [confirm, { isLoading: confirming }] = useConfirmAdminEnvioPackProofMutation();
  const [tab, setTab] = useState<'pending' | 'uploaded' | 'all'>('pending');

  const filtered = useMemo(() => {
    if (tab === 'pending') return rows.filter((r) => r.proofStatus === 'pending_transfer');
    if (tab === 'uploaded') return rows.filter((r) => r.proofStatus === 'uploaded');
    return rows;
  }, [rows, tab]);

  const pendingCount = rows.filter((r) => r.proofStatus === 'pending_transfer').length;
  const uploadedCount = rows.filter((r) => r.proofStatus === 'uploaded').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Envíos EnvíoPack</h1>
        <p className="text-sm text-slate-500 mt-1">
          Cuando un pedido se paga con envío, el vendedor transfiere a EnvíoPack y sube el comprobante. Vos lo cargás en
          el panel de EnvíoPack y marcás confirmado. La recolección sale desde la dirección del vendedor (o depósito
          OrigenRed si es venta admin).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`px-4 py-2 text-sm rounded-xl font-medium ${
            tab === 'pending' ? 'bg-amber-600 text-white' : 'bg-white/5 text-slate-400'
          }`}
        >
          Pendiente pago ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setTab('uploaded')}
          className={`px-4 py-2 text-sm rounded-xl font-medium ${
            tab === 'uploaded' ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400'
          }`}
        >
          Subido — cargar en EP ({uploadedCount})
        </button>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`px-4 py-2 text-sm rounded-xl font-medium ${
            tab === 'all' ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-400'
          }`}
        >
          Todos
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No hay pedidos en esta bandeja</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((row) => (
            <div key={`${row.orderNumber}-${row.sellerName}`} className="card p-5 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-mono text-white font-semibold">{row.orderNumber}</p>
                  <p className="text-sm text-slate-400">{row.sellerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{format(row.shippingCost)}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    {STATUS_LABEL[row.proofStatus || ''] || row.proofStatus}
                  </span>
                </div>
              </div>

              {(row.shipFromStreet || row.shipFromPostalCode) && (
                <p className="text-xs text-slate-400">
                  <strong className="text-slate-300">Retiro en:</strong>{' '}
                  {row.shipFromLabel || 'Vendedor'}
                  {row.shipFromSource === 'platform' ? ' (depósito OrigenRed)' : ''} —{' '}
                  {[row.shipFromStreet, row.shipFromCity, row.shipFromProvince, row.shipFromPostalCode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}

              {row.proofUrl && (
                <a
                  href={row.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm text-brand-400 hover:underline"
                >
                  Descargar comprobante ({row.proofFileName || 'archivo'})
                </a>
              )}

              {row.proofStatus === 'uploaded' && (
                <button
                  type="button"
                  disabled={confirming}
                  onClick={async () => {
                    await confirm(row.orderNumber);
                    refetch();
                  }}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Marcar crédito cargado en EnvíoPack
                </button>
              )}

              {row.envioPackEnvioId && (
                <p className="text-xs text-emerald-300">
                  Envío EnvíoPack #{row.envioPackEnvioId}
                  {(row as { envioPackTrackingNumber?: string }).envioPackTrackingNumber
                    ? ` — tracking ${(row as { envioPackTrackingNumber?: string }).envioPackTrackingNumber}`
                    : ''}
                </p>
              )}
              {(row as { envioPackLastError?: string }).envioPackLastError && (
                <p className="text-xs text-red-300">
                  Error API: {(row as { envioPackLastError?: string }).envioPackLastError}
                </p>
              )}

              {row.proofStatus === 'pending_transfer' && (
                <p className="text-xs text-amber-200/80">
                  El vendedor aún no subió comprobante. Recibirás notificación cuando lo haga.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
