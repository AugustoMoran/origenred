import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetSellerOrdersQuery,
  useUpdateSellerOrderMutation,
  useGetEnvioPackTransferInfoQuery,
  useUploadEnvioPackProofMutation,
} from '../../../services/marketplaceApi';

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pagado',
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
};

const FULFILLMENT_LABELS: Record<string, string> = {
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
};

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const SellerOrdersPage: React.FC = () => {
  const { data: orders = [], isLoading, refetch } = useGetSellerOrdersQuery();
  const { data: transferInfo } = useGetEnvioPackTransferInfoQuery();
  const [updateOrder, { isLoading: updating }] = useUpdateSellerOrderMutation();
  const [uploadProof, { isLoading: uploading }] = useUploadEnvioPackProofMutation();
  const [trackingByOrder, setTrackingByOrder] = useState<Record<string, string>>({});
  const [uploadMsg, setUploadMsg] = useState<Record<string, string>>({});

  const handleStatus = async (orderNumber: string, status: 'shipped' | 'delivered', trackingCode?: string) => {
    await updateOrder({ orderNumber, status, trackingCode });
    refetch();
  };

  const handleProof = async (orderNumber: string, file: File) => {
    setUploadMsg((m) => ({ ...m, [orderNumber]: '' }));
    try {
      const res = await uploadProof({ orderNumber, file }).unwrap();
      setUploadMsg((m) => ({ ...m, [orderNumber]: res.message }));
      refetch();
    } catch (e: any) {
      setUploadMsg((m) => ({ ...m, [orderNumber]: e?.data?.message || 'Error al subir' }));
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-or-navy">Mis ventas</h2>

      {isLoading ? (
        <p className="text-slate-400">Cargando...</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
          Todavía no tenés ventas
        </div>
      ) : (
        <div className="space-y-4">
          {(orders as any[]).map((order) => {
            const myItems = order.items?.filter((i: any) => i.seller) || order.items;
            const myTotal = myItems.reduce((acc: number, i: any) => acc + i.subtotal, 0);
            const myFulfillment = order.shippingBySeller?.find(
              (s: any) => myItems.some((i: any) => String(i.seller) === String(s.seller))
            );
            const fulfillmentStatus = myFulfillment?.status || 'processing';
            const shippingCost = myFulfillment?.shippingCost ?? 0;
            const needsEnvioPack =
              shippingCost > 0 &&
              order.shippingMethod !== 'pickup' &&
              myFulfillment?.envioPackProofStatus !== 'confirmed';
            const proofStatus = myFulfillment?.envioPackProofStatus;

            return (
              <div key={order._id} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-or-navy">{order.orderNumber}</p>
                    <p className="text-xs text-slate-400">
                      {order.buyer?.name || order.guestName || order.guestEmail} ·{' '}
                      {new Date(order.createdAt).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-or-navy">{format(myTotal)}</p>
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                      {FULFILLMENT_LABELS[fulfillmentStatus] || STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                </div>

                {myItems.map((item: any) => (
                  <div key={item.listing} className="text-sm text-slate-600 space-y-0.5">
                    <div className="flex justify-between">
                      <span>{item.title} ×{item.quantity}</span>
                      <span>{format(item.subtotal)}</span>
                    </div>
                    {(item.supplierName || item.supplierProductCode) && (
                      <p className="text-xs text-slate-500 font-mono">
                        Proveedor: {item.supplierName || '—'}
                        {item.supplierProductCode ? ` · Cód. ${item.supplierProductCode}` : ''}
                      </p>
                    )}
                  </div>
                ))}

                {needsEnvioPack && transferInfo && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-950 space-y-2">
                    <p className="font-semibold">Envío: transferí {format(shippingCost)} a EnvíoPack</p>
                    <p className="text-xs text-amber-900">{transferInfo.notes}</p>
                    <ul className="text-xs space-y-0.5 font-mono">
                      <li>{transferInfo.companyName} · CUIT {transferInfo.cuit}</li>
                      <li>{transferInfo.bank} · CC {transferInfo.account}</li>
                      <li>CBU: {transferInfo.cbu}</li>
                      {transferInfo.alias ? <li>Alias: {transferInfo.alias}</li> : null}
                    </ul>
                    {proofStatus === 'uploaded' ? (
                      <p className="text-xs text-emerald-800 font-medium">
                        Comprobante enviado — OrigenRed lo cargará en EnvíoPack.
                        {myFulfillment?.envioPackProofUrl && (
                          <>
                            {' '}
                            <a
                              href={myFulfillment.envioPackProofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              Ver archivo
                            </a>
                          </>
                        )}
                      </p>
                    ) : (
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-or-navy">
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="text-xs"
                          disabled={uploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleProof(order.orderNumber, f);
                          }}
                        />
                        Subir comprobante (PDF o imagen)
                      </label>
                    )}
                    {uploadMsg[order.orderNumber] && (
                      <p className="text-xs">{uploadMsg[order.orderNumber]}</p>
                    )}
                  </div>
                )}

                {myFulfillment?.trackingCode && (
                  <p className="text-xs text-slate-500">
                    Tracking: <span className="font-mono">{myFulfillment.trackingCode}</span>
                  </p>
                )}

                {fulfillmentStatus === 'processing' && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Código de seguimiento (opcional)"
                      value={trackingByOrder[order.orderNumber] || ''}
                      onChange={(e) =>
                        setTrackingByOrder((prev) => ({ ...prev, [order.orderNumber]: e.target.value }))
                      }
                      className="marketplace-field flex-1 px-3 py-2 bg-slate-50"
                    />
                    <button
                      disabled={updating}
                      onClick={() =>
                        handleStatus(
                          order.orderNumber,
                          'shipped',
                          trackingByOrder[order.orderNumber] || undefined
                        )
                      }
                      className="px-4 py-2 bg-or-blue text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                    >
                      Marcar como enviado
                    </button>
                  </div>
                )}

                {fulfillmentStatus === 'shipped' && (
                  <button
                    disabled={updating}
                    onClick={() => handleStatus(order.orderNumber, 'delivered')}
                    className="text-xs text-or-blue font-medium hover:underline disabled:opacity-50"
                  >
                    Marcar como entregado
                  </button>
                )}

                {order.chatEnabled && (
                  <Link
                    to={`/cuenta/chat/${order.orderNumber}`}
                    className="text-xs text-or-blue font-medium hover:underline"
                  >
                    💬 Responder al comprador
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
