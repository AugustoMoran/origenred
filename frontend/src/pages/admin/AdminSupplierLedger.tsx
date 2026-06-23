import React, { useMemo, useState } from 'react';
import { useGetSuppliersQuery } from '../../services/supplierApi';
import {
  useCreateLedgerEntryMutation,
  useDeleteLedgerEntryMutation,
  useGetBalanceBySupplierQuery,
  useGetLedgerEntriesQuery,
} from '../../services/supplierLedgerApi';

const toInputDate = (date: Date) => date.toISOString().split('T')[0];
const money = (value: number) => `$${(value || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminSupplierLedger: React.FC = () => {
  const today = useMemo(() => toInputDate(new Date()), []);

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [submittedRange, setSubmittedRange] = useState<{ from: string; to: string }>({ from: today, to: today });
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    date: today,
    supplierId: '',
    counterpartyName: '',
    entryType: 'INVOICE',
    amount: '',
    reference: '',
    description: '',
    adjustmentSign: 'DEBIT',
  });

  const { data: suppliers = [] } = useGetSuppliersQuery();
  const { data: ledgerData, isFetching: ledgerFetching, error: ledgerError } = useGetLedgerEntriesQuery({
    ...submittedRange,
    q: search || undefined,
  });
  const { data: balancesData, isFetching: balancesFetching, error: balancesError } = useGetBalanceBySupplierQuery();

  const [createEntry, { isLoading: creatingEntry }] = useCreateLedgerEntryMutation();
  const [deleteEntry, { isLoading: deletingEntry }] = useDeleteLedgerEntryMutation();

  const applyFilter = (e: React.FormEvent) => {
    e.preventDefault();

    if (fromDate > toDate) {
      alert('La fecha "Desde" no puede ser mayor a la fecha "Hasta"');
      return;
    }

    setSubmittedRange({ from: fromDate, to: toDate });
  };

  const handleCreate = async () => {
    const amount = Number(form.amount);

    if (!form.date) {
      alert('La fecha es obligatoria');
      return;
    }

    if (!form.supplierId && !form.counterpartyName.trim()) {
      alert('Seleccione un proveedor o escriba una referencia en "Otro"');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    try {
      await createEntry({
        date: form.date,
        supplierId: form.supplierId || undefined,
        counterpartyName: form.supplierId ? undefined : form.counterpartyName.trim(),
        entryType: form.entryType,
        amount,
        reference: form.reference.trim() || undefined,
        description: form.description.trim() || undefined,
        adjustmentSign: form.entryType === 'ADJUSTMENT' ? form.adjustmentSign : undefined,
      }).unwrap();

      setForm((prev) => ({
        ...prev,
        amount: '',
        reference: '',
        description: '',
        counterpartyName: '',
      }));
    } catch (err: any) {
      alert(err?.data?.message || 'No se pudo registrar el movimiento');
    }
  };

  const summary = balancesData?.summary || {
    totalCounterparties: 0,
    totalDebt: 0,
    totalInvoiced: 0,
    totalPaid: 0,
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">Compras y Cuenta Corriente</h1>
        <p className="page-sub">Control de deuda por proveedor: facturas, pagos y ajustes con fecha</p>
      </div>

      <div className="card p-4 sm:p-5">
        <form onSubmit={applyFilter} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="section-heading">Desde</label>
            <input type="date" className="input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} max={toDate} />
          </div>
          <div>
            <label className="section-heading">Hasta</label>
            <input type="date" className="input" value={toDate} onChange={(e) => setToDate(e.target.value)} min={fromDate} />
          </div>
          <button type="submit" className="btn-primary w-full justify-center" disabled={ledgerFetching || balancesFetching}>
            {(ledgerFetching || balancesFetching) ? 'Filtrando...' : 'Aplicar filtro'}
          </button>
          <div>
            <label className="section-heading">Buscar</label>
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Referencia, descripción..." />
          </div>
        </form>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <div className="card p-4 min-w-0">
          <p className="text-xs text-slate-500 mb-1">Deuda total</p>
          <p className="text-[clamp(1.1rem,2vw,1.85rem)] font-bold text-rose-300 leading-tight break-words">{money(summary.totalDebt)}</p>
        </div>
        <div className="card p-4 min-w-0">
          <p className="text-xs text-slate-500 mb-1">Total facturado (compras)</p>
          <p className="text-[clamp(1.1rem,2vw,1.85rem)] font-bold text-sky-300 leading-tight break-words">{money(summary.totalInvoiced)}</p>
        </div>
        <div className="card p-4 min-w-0">
          <p className="text-xs text-slate-500 mb-1">Total pagado</p>
          <p className="text-[clamp(1.1rem,2vw,1.85rem)] font-bold text-emerald-300 leading-tight break-words">{money(summary.totalPaid)}</p>
        </div>
        <div className="card p-4 min-w-0">
          <p className="text-xs text-slate-500 mb-1">Contrapartes</p>
          <p className="text-[clamp(1.1rem,2vw,1.85rem)] font-bold text-white leading-tight">{summary.totalCounterparties}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">Registrar movimiento</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="section-heading">Fecha</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} />
            </div>
            <div>
              <label className="section-heading">Tipo</label>
              <select className="input" value={form.entryType} onChange={(e) => setForm((prev) => ({ ...prev, entryType: e.target.value }))}>
                <option value="INVOICE">Factura de compra</option>
                <option value="PAYMENT">Pago</option>
                <option value="ADJUSTMENT">Ajuste</option>
              </select>
            </div>
          </div>

          <div>
            <label className="section-heading">Proveedor (opcional)</label>
            <select className="input" value={form.supplierId} onChange={(e) => setForm((prev) => ({ ...prev, supplierId: e.target.value }))}>
              <option value="">Sin proveedor (usar campo "Otro")</option>
              {suppliers.map((s: any) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          {!form.supplierId && (
            <div>
              <label className="section-heading">Otro / Referencia de contraparte</label>
              <input
                className="input"
                value={form.counterpartyName}
                onChange={(e) => setForm((prev) => ({ ...prev, counterpartyName: e.target.value }))}
                placeholder="Ej: Flete Juan Pérez"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="section-heading">Monto</label>
              <input
                type="number"
                className="input"
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            {form.entryType === 'ADJUSTMENT' && (
              <div>
                <label className="section-heading">Signo de ajuste</label>
                <select className="input" value={form.adjustmentSign} onChange={(e) => setForm((prev) => ({ ...prev, adjustmentSign: e.target.value }))}>
                  <option value="DEBIT">Aumenta deuda</option>
                  <option value="CREDIT">Reduce deuda</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="section-heading">Referencia (opcional)</label>
            <input className="input" value={form.reference} onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))} placeholder="Nro factura, recibo, transferencia..." />
          </div>

          <div>
            <label className="section-heading">Descripción (opcional)</label>
            <input className="input" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Detalle adicional..." />
          </div>

          <button className="btn-primary w-full justify-center" disabled={creatingEntry} onClick={handleCreate}>
            {creatingEntry ? 'Guardando...' : 'Guardar movimiento'}
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <h2 className="text-sm font-semibold text-white">Deuda por proveedor / contraparte</h2>
          </div>
          {balancesError ? (
            <div className="p-4 text-sm text-red-300">No se pudieron cargar los saldos</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[700px]">
                <thead>
                  <tr>
                    <th>Proveedor / Otro</th>
                    <th className="text-right">Facturado</th>
                    <th className="text-right">Pagado</th>
                    <th className="text-right">Saldo</th>
                    <th className="text-right">Movimientos</th>
                  </tr>
                </thead>
                <tbody>
                  {(balancesData?.items || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-slate-600 py-10 text-sm">Sin datos de deuda</td>
                    </tr>
                  ) : (
                    balancesData.items.map((row: any) => (
                      <tr key={`${row.supplierId || 'other'}-${row.supplierName}`}>
                        <td className="text-white text-sm">{row.supplierName || 'Otro'}</td>
                        <td className="text-right text-sky-300 font-semibold">{money(row.invoices)}</td>
                        <td className="text-right text-emerald-300 font-semibold">{money(row.payments)}</td>
                        <td className={`text-right font-bold ${Number(row.balance || 0) > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{money(row.balance)}</td>
                        <td className="text-right text-slate-300">{row.movementCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <h2 className="text-sm font-semibold text-white">Historial de movimientos</h2>
        </div>
        {ledgerError ? (
          <div className="p-4 text-sm text-red-300">No se pudo cargar el historial</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="hidden sm:table-cell">Tipo</th>
                  <th>Proveedor / Otro</th>
                  <th className="hidden lg:table-cell">Referencia</th>
                  <th className="hidden md:table-cell">Descripción</th>
                  <th className="text-right">Monto</th>
                  <th className="text-right">Impacto deuda</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(ledgerData?.items || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-slate-600 py-10 text-sm">Sin movimientos para el rango seleccionado</td>
                  </tr>
                ) : (
                  ledgerData.items.map((item: any) => (
                    <tr key={item._id}>
                      <td className="text-white text-sm">{new Date(`${new Date(item.date).toISOString().split('T')[0]}T00:00:00`).toLocaleDateString('es-AR')}</td>
                      <td className="text-slate-200 text-sm hidden sm:table-cell">{item.entryType === 'INVOICE' ? 'Factura' : item.entryType === 'PAYMENT' ? 'Pago' : 'Ajuste'}</td>
                      <td className="text-white text-sm">{item?.supplier?.name || item.counterpartyName || 'Otro'}</td>
                      <td className="text-slate-300 text-sm hidden lg:table-cell">{item.reference || '—'}</td>
                      <td className="text-slate-300 text-sm hidden md:table-cell">{item.description || '—'}</td>
                      <td className="text-right text-slate-100 font-semibold">{money(item.amount)}</td>
                      <td className={`text-right font-bold ${Number(item.signedAmount || 0) >= 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                        {Number(item.signedAmount || 0) >= 0 ? '+' : ''}{money(item.signedAmount || 0)}
                      </td>
                      <td className="text-right">
                        <button
                          className="btn-icon !text-red-400 hover:!bg-red-400/10 hover:!border-red-400/20"
                          title="Eliminar movimiento"
                          disabled={deletingEntry}
                          onClick={async () => {
                            if (!window.confirm('¿Eliminar este movimiento?')) return;
                            try {
                              await deleteEntry(item._id).unwrap();
                            } catch (err: any) {
                              alert(err?.data?.message || 'No se pudo eliminar el movimiento');
                            }
                          }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
