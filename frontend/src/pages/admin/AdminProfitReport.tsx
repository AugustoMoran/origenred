import React, { useMemo, useState } from 'react';
import { useGetProfitReportQuery } from '../../services/salesApi';

const toInputDate = (date: Date) => date.toISOString().split('T')[0];
const money = (value: number) => `$${(value || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminProfitReport: React.FC = () => {
  const today = useMemo(() => toInputDate(new Date()), []);

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [submittedRange, setSubmittedRange] = useState<{ from: string; to: string }>({ from: today, to: today });

  const { data, isLoading, isFetching, error } = useGetProfitReportQuery(submittedRange);

  const summary = data?.summary || {
    salesCount: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalIva: 0,
    totalNeto: 0,
    totalGain: 0,
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

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Informe de Ganancias</h1>
          <p className="page-sub">Desglose de costos, ganancias e IVA con filtro por fechas</p>
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
          <button type="submit" className="btn-primary w-full justify-center" disabled={isFetching}>
            {isFetching ? 'Filtrando...' : 'Aplicar filtro'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="card p-4">
              <p className="text-xs text-slate-500 mb-1">Ventas</p>
              <p className="text-2xl font-bold text-white">{summary.salesCount}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500 mb-1">Total ingresos</p>
              <p className="text-2xl font-bold text-emerald-400">{money(summary.totalRevenue)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500 mb-1">Costo total</p>
              <p className="text-2xl font-bold text-rose-400">{money(summary.totalCost)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500 mb-1">IVA total</p>
              <p className="text-2xl font-bold text-amber-300">{money(summary.totalIva)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500 mb-1">Ganancia final</p>
              <p className="text-2xl font-bold text-brand-400">{money(summary.totalGain)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white">Desglose impositivo y rentabilidad</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">IVA pagado (ventas facturadas)</span>
                  <span className="text-amber-300 font-semibold">{money(summary.totalIva)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Neto total</span>
                  <span className="text-white font-semibold">{money(summary.totalNeto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ganancia neta (regla fiscal)</span>
                  <span className="text-sky-300 font-semibold">{money(summary.gainWithoutIva)}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between">
                  <span className="text-slate-400">Margen</span>
                  <span className="text-emerald-300 font-bold">{summary.marginPercent}%</span>
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
                    <div key={row.method} className="flex justify-between text-sm border-b border-white/5 pb-2">
                      <span className="text-slate-300 capitalize">{row.method}</span>
                      <span className="text-white font-semibold">{money(row.revenue)} <span className="text-xs text-slate-500">({row.count})</span></span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05]">
              <h2 className="text-sm font-semibold text-white">Evolución diaria (rango seleccionado)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[840px]">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="text-right">Ventas</th>
                    <th className="text-right">Facturado</th>
                    <th className="text-right">Costo</th>
                    <th className="text-right">IVA</th>
                    <th className="text-right">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.byDay || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-slate-600 py-10 text-sm">Sin movimientos en el período seleccionado</td>
                    </tr>
                  ) : (
                    data.byDay.map((d: any) => (
                      <tr key={d.date}>
                        <td className="text-white text-sm">{new Date(`${d.date}T00:00:00`).toLocaleDateString('es-AR')}</td>
                        <td className="text-right text-white">{d.sales}</td>
                        <td className="text-right text-emerald-300 font-semibold">{money(d.revenue)}</td>
                        <td className="text-right text-rose-300 font-semibold">{money(d.cost)}</td>
                        <td className="text-right text-amber-300 font-semibold">{money(d.iva)}</td>
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
              <table className="data-table min-w-[920px]">
                <thead>
                  <tr>
                    <th>Sucursal</th>
                    <th className="text-right">Ventas</th>
                    <th className="text-right">Facturado</th>
                    <th className="text-right">Costo</th>
                    <th className="text-right">IVA</th>
                    <th className="text-right">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.byBranch || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-slate-600 py-10 text-sm">Sin datos por sucursal en el período seleccionado</td>
                    </tr>
                  ) : (
                    data.byBranch.map((row: any) => (
                      <tr key={`${row.branchId}-${row.branchName}`}>
                        <td className="text-white text-sm">{row.branchName || 'Sin sucursal'}</td>
                        <td className="text-right text-white">{row.sales}</td>
                        <td className="text-right text-emerald-300 font-semibold">{money(row.revenue)}</td>
                        <td className="text-right text-rose-300 font-semibold">{money(row.cost)}</td>
                        <td className="text-right text-amber-300 font-semibold">{money(row.iva)}</td>
                        <td className="text-right text-brand-300 font-bold">{money(row.gain)}</td>
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
