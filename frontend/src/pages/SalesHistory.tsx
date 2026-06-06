import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetSalesQuery, useLazyGetSaleInvoiceQuery, useLazyGetSaleRemitoQuery, useDeleteSaleMutation, useCreateCreditNoteMutation } from '../services/salesApi';
import { HasPermission } from '../components/auth/HasPermission';
import { PERMISSIONS } from '../constants/permissions';
import { inventoryApi } from '../services/inventoryApi';

export const SalesHistory = () => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: any) => state.auth);
  const isAdmin = Array.isArray(user?.roles) ? user.roles.includes('admin') : user?.role === 'admin';
  const { data: sales = [], isLoading } = useGetSalesQuery();
  const [downloadInvoice] = useLazyGetSaleInvoiceQuery();
  const [downloadRemito] = useLazyGetSaleRemitoQuery();
  const [deleteSale, { isLoading: deletingSale }] = useDeleteSaleMutation();
  const [createCreditNote, { isLoading: creatingCreditNote }] = useCreateCreditNoteMutation();
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

  const fallbackBlobDownload = async (path: string) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    const separator = path.includes('?') ? '&' : '?';
    const response = await fetch(`${apiBaseUrl}${path}${separator}cb=${Date.now()}`, {
      method: 'GET',
      credentials: 'include',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(details || `HTTP ${response.status}`);
    }

    return response.blob();
  };

  const getCreditNoteState = (sale: any) => {
    const invoiceType = String(sale?.invoiceType || '').toUpperCase();
    const isFiscalType = ['A', 'B', 'C'].includes(invoiceType);
    const isAfipAuthorized =
      isFiscalType &&
      String(sale?.billingStatus || '').toUpperCase() === 'COMPLETED' &&
      Boolean(sale?.cae) &&
      Boolean(sale?.voucherNumber);

    if (['REFUNDED', 'CANCELLED'].includes(String(sale?.status || '').toUpperCase())) {
      return { enabled: false, reason: 'La venta ya fue anulada', label: 'Anulada' };
    }

    if (!isFiscalType) {
      return {
        enabled: true,
        reason: 'Anulación interna (sin AFIP)',
        label: 'Interna',
      };
    }

    if (!isAfipAuthorized) {
      const current = String(sale?.billingStatus || 'PENDING').toUpperCase();
      return {
        enabled: true,
        reason: `Anulación interna (venta no autorizada por AFIP: ${current})`,
        label: 'Interna',
      };
    }

    return { enabled: true, reason: 'Emitir Nota de Crédito AFIP', label: 'AFIP OK' };
  };

  const handleDownload = async (id: string, invoiceNumber: string) => {
    try {
      let blob: Blob;
      try {
        blob = await downloadInvoice(id).unwrap();
      } catch {
        blob = await fallbackBlobDownload(`/sales/${id}/download`);
      }
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factura-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Error al descargar la factura');
    }
  };

  const handleDeleteSale = async (id: string) => {
    const confirmed = window.confirm('¿Eliminar esta venta? Se revertirá el stock y se quitará del sistema.');
    if (!confirmed) return;

    try {
      await deleteSale(id).unwrap();
      dispatch(inventoryApi.util.invalidateTags(['Product']));
      alert('Venta eliminada correctamente');
    } catch (err: any) {
      alert(`Error al eliminar venta: ${err?.data?.message || err?.message || 'Error desconocido'}`);
    }
  };

  const handleDownloadRemito = async (
    id: string,
    remitoNumber?: string,
    invoiceNumber?: string,
    mode: 'logistico' | 'comercial' = 'logistico'
  ) => {
    try {
      let blob: Blob;
      try {
        blob = await downloadRemito({ id, mode }).unwrap();
      } catch {
        blob = await fallbackBlobDownload(`/sales/${id}/remito?mode=${mode}`);
      }
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = mode === 'comercial' ? 'Comercial' : 'Logistico';
      a.download = `Remito-${remitoNumber || invoiceNumber || id}-${suffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Error al descargar el remito');
    }
  };

  const handleCreateCreditNote = async (sale: any) => {
    const reason = window.prompt('Motivo de la nota de crédito', 'Anulación de factura');
    if (!reason) return;

    const affectsStock = window.confirm('¿La nota de crédito debe reingresar stock al inventario?');
    const confirmed = window.confirm(
      `Se emitirá una Nota de Crédito TOTAL para ${sale.invoiceNumber}.\n` +
      `Impacto en stock: ${affectsStock ? 'Sí' : 'No'}\n\n¿Confirmás?`
    );
    if (!confirmed) return;

    try {
      const result = await createCreditNote({
        saleId: sale._id,
        mode: 'TOTAL',
        reason,
        affectsStock,
      }).unwrap();

      if (affectsStock) {
        dispatch(inventoryApi.util.invalidateTags(['Product']));
      }

      alert(`Nota de crédito creada (${result?.billingStatus || 'PENDING'}).`);
    } catch (err: any) {
      alert(`Error al emitir nota de crédito: ${err?.data?.message || err?.message || 'Error desconocido'}`);
    }
  };

  const totalRevenue = sales.reduce((acc: number, s: any) => acc + s.total, 0);
  const authorized = sales.filter((s: any) => s.cae).length;

  if (isLoading) return (
    <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Cargando historial...
    </div>
  );

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="page-title">Ventas</h1>
        <p className="page-sub">Registro fiscal y auditoría de comprobantes</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Total comprobantes</p>
          <p className="text-2xl font-bold text-white">{sales.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Autorizados AFIP</p>
          <p className="text-2xl font-bold text-emerald-400">{authorized}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Ingresos totales</p>
          <p className="text-2xl font-bold text-white">${totalRevenue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="data-table min-w-[1060px]">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Sucursal</th>
              <th>Comprobante</th>
              <th>Remito</th>
              <th>Cliente</th>
              <th>Método</th>
              <th className="text-right">Total</th>
              <th className="text-center">Estado</th>
              <th className="text-center">PDF</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-slate-600 py-12 text-sm">
                  Sin ventas registradas
                </td>
              </tr>
            )}
            {[...sales]
              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((s: any) => (
              <tr key={s._id}>
                <td>
                  <div className="text-sm font-medium text-white">{new Date(s.createdAt).toLocaleDateString('es-AR')}</div>
                  <div className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td>
                  <span className="text-xs text-slate-400 font-medium">
                    {s.branch?.name || s.branchId?.name || 'Central'}
                  </span>
                </td>
                <td>
                  <span className="font-mono text-xs font-semibold text-brand-400">{s.invoiceNumber || '—'}</span>
                </td>
                <td>
                  <span className="font-mono text-xs font-semibold text-sky-300">{s.remitoNumber || '—'}</span>
                </td>
                <td>
                  <div className="text-sm text-white">{s.clientName || 'Consumidor final'}</div>
                  {s.clientCuit && <div className="text-xs text-slate-500">{s.clientCuit}</div>}
                </td>
                <td><span className="badge-gray capitalize">{s.paymentMethod}</span></td>
                <td className="text-right font-semibold text-white">${s.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                <td className="text-center">
                  {s.cae ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="badge-green">Autorizado</span>
                      <span className="text-[10px] text-slate-600 font-mono">{s.cae?.slice(-8)}</span>
                    </div>
                  ) : (
                    <span className="badge-yellow">Simulación</span>
                  )}
                </td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleDownload(s._id, s.invoiceNumber)}
                      className="btn-icon"
                      title="Descargar Factura PDF"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDownloadRemito(s._id, s.remitoNumber, s.invoiceNumber, 'logistico')}
                      className="btn-icon !text-sky-300 hover:!bg-sky-400/10 hover:!border-sky-400/20"
                      title="Descargar Remito Logístico"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414A1 1 0 0117 8.414V18a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDownloadRemito(s._id, s.remitoNumber, s.invoiceNumber, 'comercial')}
                        className="btn-icon !text-indigo-300 hover:!bg-indigo-400/10 hover:!border-indigo-400/20"
                        title="Descargar Remito Comercial"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.2 0-4 .9-4 2s1.8 2 4 2 4 .9 4 2-1.8 2-4 2m0-10v12m0-12c2 0 3.5.7 4 1.5M12 8c-2 0-3.5.7-4 1.5" />
                        </svg>
                      </button>
                    )}

                    <HasPermission
                      permission={PERMISSIONS.SALES_EDIT}
                      fallback={<span className="text-[10px] text-slate-500">Sin permiso</span>}
                    >
                      {(() => {
                        const creditNoteState = getCreditNoteState(s);

                        return (
                          <>
                            <span className="mx-1 h-6 w-px bg-white/10" />
                            <button
                              onClick={() => creditNoteState.enabled && handleCreateCreditNote(s)}
                              disabled={creatingCreditNote || !creditNoteState.enabled}
                              className="btn-icon !text-amber-300 hover:!bg-amber-400/10 hover:!border-amber-400/20 disabled:opacity-40 disabled:cursor-not-allowed"
                              title={creditNoteState.reason}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m0 0H9m6 0v6M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                              </svg>
                            </button>

                            <button
                              onClick={() => handleDeleteSale(s._id)}
                              disabled={deletingSale}
                              className="btn-icon !text-red-400 hover:!bg-red-400/10 hover:!border-red-400/20 disabled:opacity-50"
                              title="Eliminar venta"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        );
                      })()}
                    </HasPermission>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};
