import React, { useMemo, useState } from 'react';
import { useGetProfitReportQuery } from '../../services/salesApi';
import {
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useGetExpensesQuery,
} from '../../services/expenseApi';

const toInputDate = (date: Date) => date.toISOString().split('T')[0];
const money = (value: number) => `$${(value || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const exact = (value: number) => `${value ?? 0}`;

export const AdminProfitReport: React.FC = () => {
  const today = useMemo(() => toInputDate(new Date()), []);

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [submittedRange, setSubmittedRange] = useState<{ from: string; to: string }>({ from: today, to: today });
  const [expenseForm, setExpenseForm] = useState({
    date: today,
    description: '',
    amount: '',
    category: '',
    affectsProfit: true,
  });

  const { data, isLoading, isFetching, error } = useGetProfitReportQuery(submittedRange);
  const {
    data: expensesData,
    isFetching: expensesFetching,
    error: expensesError,
  } = useGetExpensesQuery(submittedRange);
  const [createExpense, { isLoading: creatingExpense }] = useCreateExpenseMutation();
  const [deleteExpense, { isLoading: deletingExpense }] = useDeleteExpenseMutation();

  const summary = data?.summary || {
    salesCount: 0,
    totalRevenue: 0,
    totalInvoicedRevenue: 0,
    totalNonInvoicedRevenue: 0,
    invoicedSalesCount: 0,
    nonInvoicedSalesCount: 0,
    pendingFiscalRevenue: 0,
    failedFiscalRevenue: 0,
    totalCost: 0,
    totalIva: 0,
    totalNeto: 0,
    totalDiscount: 0,
    totalExpenses: 0,
    totalExpensesAffectingProfit: 0,
    totalExpensesInformative: 0,
    totalGain: 0,
    gainAfterExpenses: 0,
    totalCommission: 0,
    gainWithoutIva: 0,
    marginPercent: 0,
  };

  const applyFilter = (e: React.FormEvent) => {
    e.preventDefault();

    if (fromDate > toDate) {
      alert('La fecha "Desde" no puede ser mayor a la fecha "Hasta"');
      return;
    }

    setSubmittedRange({ from: fromDate, to: toDate });
  };

  const resetToToday = () => {
    setFromDate(today);
    setToDate(today);
    setSubmittedRange({ from: today, to: today });
  };

  const handleCreateExpense = async () => {
    const amount = Number(expenseForm.amount);

    if (!expenseForm.date) {
      alert('La fecha es obligatoria');
      return;
    }
    if (!expenseForm.description.trim()) {
      alert('La descripción es obligatoria');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    try {
      await createExpense({
        date: expenseForm.date,
        description: expenseForm.description.trim(),
        amount,
        category: expenseForm.category.trim() || undefined,
        affectsProfit: expenseForm.affectsProfit,
      }).unwrap();

      setExpenseForm((prev) => ({
        ...prev,
        description: '',
        amount: '',
        category: '',
      }));
    } catch (err: any) {
      alert(err?.data?.message || 'No se pudo crear el gasto');
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Informe de Ganancias</h1>
          <p className="page-sub">Desglose de costos, ganancias, gastos e IVA con filtro por fechas</p>
        </div>
        <button onClick={resetToToday} className="btn-secondary w-full sm:w-auto justify-center">
          Hoy
        </button>
      </div>

      <div className="card p-4 sm:p-5">
        <form onSubmit={applyFilter} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="section-heading">Desde</label>
            <input
              type="date"
              className="input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate}
            />
          </div>
          <div>
            <label className="section-heading">Hasta</label>
            <input
              type="date"
              className="input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate}
            />
          </div>
          <button type="submit" className="btn-primary w-full justify-center" disabled={isFetching || expensesFetching}>
            {(isFetching || expensesFetching) ? 'Filtrando...' : 'Aplicar filtro'}
          </button>
          <div className="text-xs text-slate-500">
            Rango actual: <span className="text-slate-300">{submittedRange.from}</span> a <span className="text-slate-300">{submittedRange.to}</span>
          </div>
        </form>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generando informe...
        </div>
      ) : error ? (
        <div className="badge-red p-4">No se pudo cargar el informe de ganancias</div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            <div className="card p-4 min-w-0">
              <p className="text-xs text-slate-500 mb-1">Ventas</p>
              <p className="text-[clamp(1.15rem,2vw,1.85rem)] font-bold text-white leading-tight">{summary.salesCount}</p>
            </div>
            <div className="card p-4 min-w-0">
              <p className="text-xs text-slate-500 mb-1">Total ingresos</p>
              <p className="text-[clamp(1.1rem,2vw,1.85rem)] font-bold text-emerald-400 leading-tight break-words">{money(summary.totalRevenue)}</p>
            </div>
            <div className="card p-4 min-w-0">
              <p className="text-xs text-slate-500 mb-1">Facturado AFIP</p>
              <p className="text-[clamp(1.1rem,2vw,1.85rem)] font-bold text-cyan-300 leading-tight break-words">{money(summary.totalInvoicedRevenue)}</p>
            </div>
            <div className="card p-4 min-w-0">
              <p className="text-xs text-slate-500 mb-1">No facturado</p>
              <p className="text-[clamp(1.1rem,2vw,1.85rem)] font-bold text-slate-200 leading-tight break-words">{money(summary.totalNonInvoicedRevenue)}</p>
            </div>
            <div className="card p-4 min-w-0">
              <p className="text-xs text-slate-500 mb-1">Costo total</p>
              <p className="text-[clamp(1.1rem,2vw,1.85rem)] font-bold text-rose-400 leading-tight break-words">{money(summary.totalCost)}</p>
            </div>
            <div className="card p-4 min-w-0">
              <p className="text-xs text-slate-500 mb-1">IVA total</p>
              <p className="text-[clamp(1.1rem,2vw,1.85rem)] font-bold text-amber-300 leading-tight break-words">{money(summary.totalIva)}</p>
            </div>
            <div className="card p-4 min-w-0">
              <p className="text-xs text-slate-500 mb-1">Gastos (impactan)</p>
              <p className="text-[clamp(1.1rem,2vw,1.85rem)] font-bold text-orange-300 leading-tight break-words">{money(summary.totalExpensesAffectingProfit)}</p>
            </div>
            <div className="card p-4 min-w-0">
              <p className="text-xs text-slate-500 mb-1">Ganancia final</p>
              <p className="text-[clamp(1.1rem,2vw,1.85rem)] font-bold text-brand-400 leading-tight break-words">{money(summary.totalGain)}</p>
            </div>
            <div className="card p-4 min-w-0">
              <p className="text-xs text-slate-500 mb-1">Ganancia post-gastos</p>
              <p className="text-[clamp(1.1rem,2vw,1.85rem)] font-bold text-fuchsia-300 leading-tight break-words">{money(summary.gainAfterExpenses)}</p>
            </div>
            <div className="card p-4 min-w-0">
              <p className="text-xs text-slate-500 mb-1">Liquidación vendedores</p>
              <p className="text-[clamp(1.1rem,2vw,1.85rem)] font-bold text-violet-300 leading-tight break-words">${exact(summary.totalCommission)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white">Desglose impositivo y rentabilidad</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">IVA pagado (ventas fiscales)</span>
                  <span className="text-amber-300 font-semibold text-right">{money(summary.totalIva)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Neto total</span>
                  <span className="text-white font-semibold text-right">{money(summary.totalNeto)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Descuento total aplicado</span>
                  <span className="text-orange-300 font-semibold text-right">{money(summary.totalDiscount)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Ganancia neta (regla fiscal)</span>
                  <span className="text-sky-300 font-semibold text-right">{money(summary.gainWithoutIva)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Facturación fiscal pendiente AFIP</span>
                  <span className="text-yellow-300 font-semibold text-right">{money(summary.pendingFiscalRevenue)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Facturación fiscal fallida AFIP</span>
                  <span className="text-red-300 font-semibold text-right">{money(summary.failedFiscalRevenue)}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between gap-3">
                  <span className="text-slate-400">Margen</span>
                  <span className="text-emerald-300 font-bold text-right">{summary.marginPercent}%</span>
                </div>
              </div>
            </div>

            <div className="card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white">Facturado vs no facturado</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3 border-b border-white/5 pb-2">
                  <span className="text-slate-300">Ventas facturadas AFIP</span>
                  <span className="text-cyan-300 font-semibold text-right">{money(summary.totalInvoicedRevenue)} <span className="text-xs text-slate-500">({summary.invoicedSalesCount})</span></span>
                </div>
                <div className="flex justify-between gap-3 border-b border-white/5 pb-2">
                  <span className="text-slate-300">Ventas no facturadas</span>
                  <span className="text-slate-100 font-semibold text-right">{money(summary.totalNonInvoicedRevenue)} <span className="text-xs text-slate-500">({summary.nonInvoicedSalesCount})</span></span>
                </div>
                <div className="flex justify-between gap-3 border-b border-white/5 pb-2">
                  <span className="text-slate-300">Gastos informativos</span>
                  <span className="text-orange-200 font-semibold text-right">{money(summary.totalExpensesInformative)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-300">Gasto total cargado</span>
                  <span className="text-orange-300 font-semibold text-right">{money(summary.totalExpenses)}</span>
                </div>
              </div>
            </div>

            <div className="card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white">Por método de cobro</h2>
              <div className="space-y-2">
                {(data?.byPaymentMethod || []).length === 0 ? (
                  <p className="text-sm text-slate-500">Sin datos para el rango seleccionado</p>
                ) : (
                  data.byPaymentMethod.map((row: any) => (
                    <div key={row.method} className="flex justify-between text-sm border-b border-white/5 pb-2 gap-3">
                      <span className="text-slate-300 capitalize">{row.method}</span>
                      <span className="text-white font-semibold text-right">{money(row.revenue)} <span className="text-xs text-slate-500">({row.count})</span></span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white">Cargar gasto</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="section-heading">Fecha</label>
                  <input
                    type="date"
                    className="input"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="section-heading">Monto</label>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="section-heading">Descripción</label>
                <input
                  className="input"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Ej: Alquiler, logística, marketing..."
                />
              </div>
              <div>
                <label className="section-heading">Categoría (opcional)</label>
                <input
                  className="input"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Ej: Servicios"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={expenseForm.affectsProfit}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, affectsProfit: e.target.checked }))}
                />
                Descontar este gasto de la ganancia
              </label>
              <button
                className="btn-primary w-full justify-center"
                onClick={handleCreateExpense}
                disabled={creatingExpense}
              >
                {creatingExpense ? 'Guardando...' : 'Guardar gasto'}
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <h2 className="text-sm font-semibold text-white">Gastos cargados (rango seleccionado)</h2>
              </div>
              {expensesError ? (
                <div className="p-4 text-sm text-red-300">No se pudieron cargar los gastos</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Descripción</th>
                        <th className="text-right">Monto</th>
                        <th>Impacta ganancia</th>
                        <th className="text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(expensesData?.items || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-slate-600 py-10 text-sm">Sin gastos en el período seleccionado</td>
                        </tr>
                      ) : (
                        expensesData.items.map((item: any) => (
                          <tr key={item._id}>
                            <td className="text-white text-sm">{new Date(`${new Date(item.date).toISOString().split('T')[0]}T00:00:00`).toLocaleDateString('es-AR')}</td>
                            <td className="text-slate-200 text-sm">{item.description}</td>
                            <td className="text-right text-orange-300 font-semibold">{money(item.amount)}</td>
                            <td>
                              {item.affectsProfit ? <span className="badge-red">Sí</span> : <span className="badge-gray">No</span>}
                            </td>
                            <td className="text-right">
                              <button
                                className="btn-icon !text-red-400 hover:!bg-red-400/10 hover:!border-red-400/20"
                                title="Eliminar gasto"
                                disabled={deletingExpense}
                                onClick={async () => {
                                  if (!window.confirm('¿Eliminar este gasto?')) return;
                                  try {
                                    await deleteExpense(item._id).unwrap();
                                  } catch (err: any) {
                                    alert(err?.data?.message || 'No se pudo eliminar el gasto');
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

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05]">
              <h2 className="text-sm font-semibold text-white">Evolución diaria (rango seleccionado)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="text-right">Ventas</th>
                    <th className="text-right">Facturado</th>
                    <th className="text-right">Costo</th>
                    <th className="text-right">IVA</th>
                    <th className="text-right">Descuento</th>
                    <th className="text-right">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.byDay || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-slate-600 py-10 text-sm">Sin movimientos en el período seleccionado</td>
                    </tr>
                  ) : (
                    data.byDay.map((d: any) => (
                      <tr key={d.date}>
                        <td className="text-white text-sm">{new Date(`${d.date}T00:00:00`).toLocaleDateString('es-AR')}</td>
                        <td className="text-right text-white">{d.sales}</td>
                        <td className="text-right text-emerald-300 font-semibold">{money(d.revenue)}</td>
                        <td className="text-right text-rose-300 font-semibold">{money(d.cost)}</td>
                        <td className="text-right text-amber-300 font-semibold">{money(d.iva)}</td>
                        <td className="text-right text-orange-300 font-semibold">{money(d.discount)}</td>
                        <td className="text-right text-brand-300 font-bold">{money(d.gain)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05]">
              <h2 className="text-sm font-semibold text-white">Ganancias por sucursal</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Sucursal</th>
                    <th className="text-right">Ventas</th>
                    <th className="text-right">Facturado</th>
                    <th className="text-right">Costo</th>
                    <th className="text-right">IVA</th>
                    <th className="text-right">Descuento</th>
                    <th className="text-right">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.byBranch || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-slate-600 py-10 text-sm">Sin datos por sucursal en el período seleccionado</td>
                    </tr>
                  ) : (
                    data.byBranch.map((row: any) => (
                      <tr key={`${row.branchId}-${row.branchName}`}>
                        <td className="text-white text-sm">{row.branchName || 'Sin sucursal'}</td>
                        <td className="text-right text-white">{row.sales}</td>
                        <td className="text-right text-emerald-300 font-semibold">{money(row.revenue)}</td>
                        <td className="text-right text-rose-300 font-semibold">{money(row.cost)}</td>
                        <td className="text-right text-amber-300 font-semibold">{money(row.iva)}</td>
                        <td className="text-right text-orange-300 font-semibold">{money(row.discount)}</td>
                        <td className="text-right text-brand-300 font-bold">{money(row.gain)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05]">
              <h2 className="text-sm font-semibold text-white">Liquidación por vendedor</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Vendedor</th>
                    <th className="text-right">Ventas</th>
                    <th className="text-right">Total bruto</th>
                    <th className="text-right">% efectivo</th>
                    <th className="text-right">Liquidación</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.bySeller || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-slate-600 py-10 text-sm">Sin datos de liquidación para el período seleccionado</td>
                    </tr>
                  ) : (
                    data.bySeller.map((row: any) => (
                      <tr key={`${row.sellerId}-${row.sellerName}`}>
                        <td className="text-white text-sm">{row.sellerName || 'Sin vendedor'}</td>
                        <td className="text-right text-white">{row.sales}</td>
                        <td className="text-right text-emerald-300 font-semibold">{money(row.revenue)}</td>
                        <td className="text-right text-slate-200">{exact(row.effectiveRate)}%</td>
                        <td className="text-right text-fuchsia-300 font-bold">${exact(row.commission)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05]">
              <h2 className="text-sm font-semibold text-white">Liquidación vendedor por sucursal</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Vendedor</th>
                    <th className="hidden sm:table-cell">Sucursal</th>
                    <th className="text-right">Ventas</th>
                    <th className="text-right">Total bruto</th>
                    <th className="text-right hidden md:table-cell">% efectivo</th>
                    <th className="text-right">Liquidación</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.bySellerBranch || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-slate-600 py-10 text-sm">Sin datos vendedor/sucursal para el período seleccionado</td>
                    </tr>
                  ) : (
                    data.bySellerBranch.map((row: any) => (
                      <tr key={`${row.sellerId}-${row.branchId}-${row.sellerName}-${row.branchName}`}>
                        <td className="text-white text-sm">{row.sellerName || 'Sin vendedor'}</td>
                        <td className="text-slate-200 text-sm hidden sm:table-cell">{row.branchName || 'Sin sucursal'}</td>
                        <td className="text-right text-white">{row.sales}</td>
                        <td className="text-right text-emerald-300 font-semibold">{money(row.revenue)}</td>
                        <td className="text-right text-slate-200 hidden md:table-cell">{exact(row.effectiveRate)}%</td>
                        <td className="text-right text-fuchsia-300 font-bold">${exact(row.commission)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
