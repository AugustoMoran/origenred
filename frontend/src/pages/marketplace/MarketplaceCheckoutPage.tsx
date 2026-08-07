import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { SEO } from '../../components/ecommerce/SEO';
import {
  selectMarketplaceCartItems,
  selectMarketplaceCartTotal,
  clearMarketplaceCart,
} from '../../store/marketplaceCartSlice';
import {
  usePreviewCheckoutMutation,
  useCreateCheckoutMutation,
} from '../../services/marketplaceApi';

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const MarketplaceCheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const items = useSelector(selectMarketplaceCartItems);
  const subtotal = useSelector(selectMarketplaceCartTotal);
  const { user } = useSelector((state: RootState) => state.auth);

  const [previewCheckout, { data: preview, isLoading: previewLoading }] = usePreviewCheckoutMutation();
  const [createCheckout, { isLoading: submitting }] = useCreateCheckoutMutation();

  const [step, setStep] = useState<'address' | 'confirm'>('address');
  const [form, setForm] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    street: '',
    city: '',
    province: '',
    postalCode: '',
    notes: '',
  });
  const [shippingMethod, setShippingMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [error, setError] = useState('');

  useEffect(() => {
    if (items.length === 0) return;
    if (shippingMethod === 'pickup') {
      previewCheckout({
        items: items.map((i) => ({ listingId: i.listingId, quantity: i.quantity })),
        shippingMethod: 'pickup',
      });
      return;
    }
    if (form.postalCode.length >= 4) {
      previewCheckout({
        items: items.map((i) => ({ listingId: i.listingId, quantity: i.quantity })),
        postalCode: form.postalCode,
        province: form.province,
        shippingMethod,
      });
    }
  }, [form.postalCode, form.province, shippingMethod, items.length]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  if (items.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-slate-400">Tu carrito está vacío</p>
        <Link to="/buscar" className="text-or-red font-medium hover:underline">Explorar productos</Link>
      </div>
    );
  }

  const handleSubmit = async () => {
    setError('');
    if (!form.fullName || !form.phone) {
      setError('Completá nombre y teléfono');
      return;
    }
    if (shippingMethod === 'delivery') {
      if (!form.street || !form.city || !form.province || !form.postalCode) {
        setError('Completá todos los datos de envío');
        return;
      }
    }
    if (!user && !form.email) {
      setError('Ingresá tu email o iniciá sesión');
      return;
    }

    const shippingAddress = {
      fullName: form.fullName,
      phone: form.phone,
      street: shippingMethod === 'pickup' ? 'Retiro en persona' : form.street,
      city: shippingMethod === 'pickup' ? form.city || 'Retiro' : form.city,
      province: shippingMethod === 'pickup' ? form.province || '—' : form.province,
      postalCode: shippingMethod === 'pickup' ? form.postalCode || '0000' : form.postalCode,
      notes: form.notes,
    };

    try {
      const result = await createCheckout({
        items: items.map((i) => ({ listingId: i.listingId, quantity: i.quantity })),
        guestEmail: user ? undefined : form.email,
        guestName: form.fullName,
        guestPhone: form.phone,
        shippingAddress,
        shippingMethod,
      }).unwrap();

      dispatch(clearMarketplaceCart());

      if (result.multiOrder && result.payments?.length) {
        result.payments.forEach((p) => {
          const url = p.initPoint || p.sandboxInitPoint;
          if (url) window.open(url, '_blank', 'noopener');
        });
        alert(
          `Se crearon ${result.orders?.length || 1} pedidos (uno por vendedor). Completa cada pago en Mercado Pago.`
        );
        navigate('/cuenta/compras');
        return;
      }

      if (result.payment?.initPoint) {
        window.location.href = result.payment.initPoint;
        return;
      }

      navigate(`/compras/confirmacion/${result.order.orderNumber}`);
    } catch (err: any) {
      setError(err?.data?.message || 'Error al procesar el pedido');
    }
  };

  const total = preview?.total ?? subtotal;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <SEO title="Checkout — OrigenRed" />

      <h1 className="text-2xl font-bold text-or-navy">Finalizar compra</h1>

      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {step === 'address' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
              <h2 className="font-semibold text-or-navy">
                {shippingMethod === 'pickup' ? 'Datos de contacto' : 'Datos de envío'}
              </h2>
              {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

              {!user && (
                <Field label="Email *" type="email" value={form.email} onChange={set('email')} />
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nombre completo *" value={form.fullName} onChange={set('fullName')} />
                <Field label="Teléfono *" value={form.phone} onChange={set('phone')} />
                {shippingMethod === 'delivery' && (
                  <>
                    <Field label="Calle y número *" value={form.street} onChange={set('street')} className="sm:col-span-2" />
                    <Field label="Ciudad *" value={form.city} onChange={set('city')} />
                    <Field label="Provincia *" value={form.province} onChange={set('province')} />
                    <Field label="Código postal *" value={form.postalCode} onChange={set('postalCode')} />
                  </>
                )}
                {shippingMethod === 'pickup' && (
                  <>
                    <Field label="Ciudad (opcional)" value={form.city} onChange={set('city')} />
                    <Field label="Provincia (opcional)" value={form.province} onChange={set('province')} />
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer ${shippingMethod === 'delivery' ? 'border-or-blue bg-blue-50' : 'border-slate-200'}`}>
                  <input type="radio" checked={shippingMethod === 'delivery'} onChange={() => setShippingMethod('delivery')} />
                  <span className="text-sm font-medium">Envío a domicilio</span>
                </label>
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer ${shippingMethod === 'pickup' ? 'border-or-blue bg-blue-50' : 'border-slate-200'}`}>
                  <input type="radio" checked={shippingMethod === 'pickup'} onChange={() => setShippingMethod('pickup')} />
                  <span className="text-sm font-medium">Retiro</span>
                </label>
              </div>

              <textarea
                value={form.notes}
                onChange={set('notes')}
                placeholder="Notas para el vendedor (opcional)"
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              />

              <button
                onClick={() => setStep('confirm')}
                className="w-full py-3 bg-or-navy text-white font-semibold rounded-xl hover:bg-or-blue transition-colors"
              >
                Continuar
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
              <h2 className="font-semibold text-or-navy">Confirmar pedido</h2>
              {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

              <div className="text-sm text-slate-600 space-y-1">
                {shippingMethod === 'pickup' ? (
                  <p><strong>Retiro en persona</strong> — {form.fullName} — {form.phone}</p>
                ) : (
                  <p><strong>Envío a:</strong> {form.street}, {form.city}, {form.province} ({form.postalCode})</p>
                )}
                <p><strong>Contacto:</strong> {form.fullName} — {form.phone}</p>
              </div>

              {preview?.bySeller?.map((group: any) => (
                <div key={group.sellerId} className="border border-slate-100 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-or-navy">{group.sellerName}</p>
                  {group.items.map((item: any) => (
                    <div key={item.listing} className="flex justify-between text-sm text-slate-600">
                      <span>{item.title} × {item.quantity}</span>
                      <span>{format(item.subtotal)}</span>
                    </div>
                  ))}
                  {shippingMethod === 'delivery' && (
                    <div className="flex justify-between text-sm text-slate-500 pt-1 border-t border-slate-50">
                      <span>Envío</span>
                      <span>{group.freeShipping ? 'Gratis' : format(group.shippingCost)}</span>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-3">
                <button onClick={() => setStep('address')} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600">
                  Volver
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 bg-or-red text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-60"
                >
                  {submitting ? 'Procesando...' : preview?.mercadoPagoEnabled ? 'Pagar con Mercado Pago' : 'Confirmar pedido'}
                </button>
              </div>

              {!preview?.mercadoPagoEnabled && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  Mercado Pago no configurado — el pedido se registrará y podrás pagar cuando esté activo.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 sticky top-24">
            <h3 className="font-semibold text-or-navy">Resumen</h3>
            {items.map((item) => (
              <div key={item.listingId} className="flex justify-between text-sm text-slate-600">
                <span className="truncate mr-2">{item.title} ×{item.quantity}</span>
                <span className="flex-shrink-0">{format(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-slate-100 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{format(preview?.subtotal ?? subtotal)}</span>
              </div>
              {preview && (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>Envío</span>
                    <span>{preview.shippingTotal > 0 ? format(preview.shippingTotal) : 'A calcular'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-xs">
                    <span>Comisión OrigenRed ({preview.commissionPercent}%)</span>
                    <span>incluida</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-bold text-or-navy text-lg pt-1">
                <span>Total</span>
                <span>{previewLoading ? '...' : format(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
}> = ({ label, value, onChange, type = 'text', className = '' }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-or-navy mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-or-blue focus:ring-2 focus:ring-or-blue/10"
    />
  </div>
);
