import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import { MarketplaceReportModal } from '../../components/marketplace/MarketplaceReportModal';
import { ReturnRequestModal } from '../../components/marketplace/ReturnRequestModal';
import { useGetOrderQuery, useGetReturnForOrderQuery } from '../../services/marketplaceApi';

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  paid: 'Pagado',
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

const FULFILLMENT_LABELS: Record<string, string> = {
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
};

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const MarketplaceOrderDetailPage: React.FC = () => {
  const { orderNumber = '' } = useParams();
  const { data: order, isLoading, error } = useGetOrderQuery(orderNumber, { skip: !orderNumber });
  const { data: returnData, refetch: refetchReturn } = useGetReturnForOrderQuery(orderNumber, { skip: !orderNumber });
  const [showReport, setShowReport] = useState(false);
  const [showReturn, setShowReturn] = useState(false);

  if (isLoading) {
    return <p className="text-center py-16 text-slate-400">Cargando pedido...</p>;
  }

  if (error || !order) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Pedido no encontrado</p>
        <Link to="/cuenta/compras" className="text-or-blue text-sm hover:underline mt-2 block">
          Volver a mis compras
        </Link>
      </div>
    );
  }

  const o = order as any;
  const existingReturn = returnData?.request as any;
  const canRequestReturn =
    ['paid', 'processing', 'shipped', 'delivered'].includes(o.status) && !existingReturn;
  const returnReasonLabels = returnData?.reasonLabels || {};

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <SEO title={`Pedido ${o.orderNumber}`} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <Link to="/cuenta/compras" className="text-sm text-slate-400 hover:text-or-navy">← Mis compras</Link>
          <h1 className="text-2xl font-bold text-or-navy mt-1">{o.orderNumber}</h1>
        </div>
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-600">
          {STATUS_LABELS[o.status] || o.status}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <div className="flex justify-between text-lg font-bold text-or-navy">
          <span>Total</span>
          <span>{format(o.total)}</span>
        </div>

        {o.shippingAddress && (
          <div className="text-sm text-slate-600 space-y-1 border-t border-slate-100 pt-4">
            <p className="font-medium text-or-navy">Envío a</p>
            <p>{o.shippingAddress.fullName}</p>
            <p>{o.shippingAddress.street}</p>
            <p>{o.shippingAddress.city}, {o.shippingAddress.province} ({o.shippingAddress.postalCode})</p>
            <p>{o.shippingAddress.phone}</p>
          </div>
        )}

        {o.trackingCode && (
          <p className="text-sm text-slate-600">
            Seguimiento: <span className="font-mono">{o.trackingCode}</span>
          </p>
        )}

        {o.shippingBySeller?.length > 0 && (
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-sm font-medium text-or-navy">Estado por vendedor</p>
            {o.shippingBySeller.map((s: any) => (
              <div key={String(s.seller)} className="flex justify-between text-sm text-slate-600">
                <span>{s.sellerName || 'Vendedor'}</span>
                <span>
                  {FULFILLMENT_LABELS[s.status] || s.status}
                  {s.trackingCode && ` · ${s.trackingCode}`}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-slate-100 pt-4 space-y-2">
          <p className="text-sm font-medium text-or-navy">Productos</p>
          {o.items?.map((item: any) => (
            <div key={item.listing} className="flex justify-between text-sm text-slate-600">
              <span>{item.title} ×{item.quantity}</span>
              <span>{format(item.subtotal)}</span>
            </div>
          ))}
        </div>

        {o.chatEnabled && o.status !== 'pending_payment' && (
          <Link
            to={`/cuenta/chat/${o.orderNumber}`}
            className="inline-flex text-sm text-or-red font-medium hover:underline"
          >
            💬 Chatear con el vendedor
          </Link>
        )}

        <button
          type="button"
          onClick={() => setShowReport(true)}
          className="text-sm text-slate-500 hover:text-or-navy"
        >
          Denunciar pedido
        </button>

        {canRequestReturn && (
          <button
            type="button"
            onClick={() => setShowReturn(true)}
            className="text-sm text-or-blue font-medium hover:underline"
          >
            Solicitar devolución
          </button>
        )}

        {existingReturn && (
          <div className="text-sm text-slate-600 border-t border-slate-100 pt-3">
            <p className="font-medium text-or-navy">Devolución: {existingReturn.status}</p>
            <p>{returnReasonLabels[existingReturn.reason] || existingReturn.reason}</p>
          </div>
        )}
      </div>

      {showReturn && (
        <ReturnRequestModal
          orderNumber={o.orderNumber}
          onClose={() => setShowReturn(false)}
          onSuccess={() => refetchReturn()}
        />
      )}

      {showReport && (
        <MarketplaceReportModal
          title="Denunciar pedido"
          subtitle={o.orderNumber}
          orderId={o._id}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};
