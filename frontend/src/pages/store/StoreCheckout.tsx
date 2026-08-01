import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { SEO } from '../../components/ecommerce/SEO';
import { selectCartItems, selectCartTotal, clearCart } from '../../store/cartSlice';
import { useCreateStoreOrderMutation } from '../../services/ecommerceApi';
import { useGetMercadoPagoConfigQuery, useCreatePreferenceMutation } from '../../services/paymentsApi';
import { useTrackEventMutation } from '../../services/analyticsApi';
import { buildWhatsAppOrderUrl } from '../../utils/whatsappOrderMessage';

type PaymentChoice = 'mercadopago' | 'whatsapp';

export const StoreCheckout: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const [createOrder, { isLoading: creatingOrder }] = useCreateStoreOrderMutation();
  const [createPreference, { isLoading: creatingPreference }] = useCreatePreferenceMutation();
  const { data: mpConfig } = useGetMercadoPagoConfigQuery();
  const [trackEvent] = useTrackEventMutation();

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    street: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Argentina',
    notes: '',
  });
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('mercadopago');
  const [error, setError] = useState('');

  const isLoading = creatingOrder || creatingPreference;
  const mpEnabled = Boolean(mpConfig?.enabled);

  useEffect(() => {
    trackEvent({ event: 'page_view', path: '/checkout' }).catch(() => {});
  }, [trackEvent]);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/products');
    }
  }, [items.length, navigate]);

  useEffect(() => {
    if (!mpEnabled && paymentChoice === 'mercadopago') {
      setPaymentChoice('whatsapp');
    }
  }, [mpEnabled, paymentChoice]);

  const handleWhatsAppCheckout = () => {
    const url = buildWhatsAppOrderUrl(items, total, form);
    trackEvent({ event: 'whatsapp_checkout', metadata: { total, items: items.length } }).catch(() => {});
    dispatch(clearCart());
    window.open(url, '_blank', 'noopener,noreferrer');
    navigate('/products');
  };

  const handleMercadoPagoCheckout = async () => {
    const order = await createOrder({
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      customerName: form.customerName.trim(),
      customerEmail: form.customerEmail.trim(),
      customerPhone: form.customerPhone.trim() || undefined,
      shippingAddress: {
        street: form.street.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim(),
      },
      notes: form.notes.trim() || undefined,
      paymentMethod: 'mercadopago',
    }).unwrap();

    trackEvent({ event: 'purchase', metadata: { orderId: order._id, total } }).catch(() => {});

    const preference = await createPreference({
      saleId: order._id,
      payerEmail: form.customerEmail.trim(),
    }).unwrap();

    dispatch(clearCart());
    const redirectUrl = preference.initPoint || preference.sandboxInitPoint;
    if (redirectUrl) {
      window.location.href = redirectUrl;
      return;
    }

    navigate(`/checkout/confirmation/${order._id}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (paymentChoice === 'whatsapp') {
        handleWhatsAppCheckout();
        return;
      }

      if (!mpEnabled) {
        setError('Mercado Pago no está disponible. Elegí comprar por WhatsApp.');
        return;
      }

      await handleMercadoPagoCheckout();
    } catch (err: any) {
      setError(err?.data?.message || 'Error al procesar el pedido');
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <SEO title="Checkout" description="Completá tu pedido" />

      <div>
        <h1 className="page-title">Checkout</h1>
        <p className="page-sub">Elegí cómo querés pagar y completá tus datos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-3 card p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">{error}</div>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-white">¿Cómo querés pagar?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mpEnabled && (
                <button
                  type="button"
                  onClick={() => setPaymentChoice('mercadopago')}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    paymentChoice === 'mercadopago'
                      ? 'border-brand-500/50 bg-brand-500/10 ring-1 ring-brand-500/30'
                      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Mercado Pago</p>
                      <p className="text-xs text-slate-500">Pago online seguro</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Confirmás el pedido y te redirigimos a Mercado Pago para pagar.
                  </p>
                </button>
              )}

              <button
                type="button"
                onClick={() => setPaymentChoice('whatsapp')}
                className={`text-left rounded-xl border p-4 transition-all ${
                  paymentChoice === 'whatsapp'
                    ? 'border-[#25D366]/50 bg-[#25D366]/10 ring-1 ring-[#25D366]/30'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]'
                } ${!mpEnabled ? 'sm:col-span-2' : ''}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-[#25D366]/15 text-[#25D366] flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.89-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">WhatsApp</p>
                    <p className="text-xs text-slate-500">Coordinar con un asesor</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Enviás el pedido por WhatsApp. No reserva stock ni genera venta automática.
                </p>
              </button>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-white pt-2">Datos de contacto</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="section-heading">Nombre completo</label>
              <input className="input" required value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </div>
            <div>
              <label className="section-heading">Email</label>
              <input type="email" className="input" required value={form.customerEmail}
                onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
            </div>
            <div>
              <label className="section-heading">Teléfono</label>
              <input className="input" value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
            </div>
          </div>

          <h2 className="text-sm font-semibold text-white pt-2">Dirección de envío</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="section-heading">Calle y número</label>
              <input className="input" required value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })} />
            </div>
            <div>
              <label className="section-heading">Ciudad</label>
              <input className="input" required value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="section-heading">Provincia</label>
              <input className="input" required value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })} />
            </div>
            <div>
              <label className="section-heading">Código postal</label>
              <input className="input" required value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
            </div>
            <div>
              <label className="section-heading">País</label>
              <input className="input" value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="section-heading">Notas (opcional)</label>
            <textarea className="input min-h-[80px]" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-xl font-semibold transition-colors ${
              paymentChoice === 'whatsapp'
                ? 'bg-[#25D366] hover:bg-[#20bd5a] text-white'
                : 'btn-primary'
            }`}
          >
            {isLoading
              ? 'Procesando...'
              : paymentChoice === 'whatsapp'
                ? 'Enviar pedido por WhatsApp'
                : 'Pagar con Mercado Pago'}
          </button>
        </form>

        <div className="lg:col-span-2 card p-6 space-y-4 h-fit">
          <h2 className="text-sm font-semibold text-white">Resumen</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between gap-2 text-sm">
                <span className="text-slate-400 truncate">{item.name} × {item.quantity}</span>
                <span className="text-white tabular-nums flex-shrink-0">
                  ${(item.price * item.quantity).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.05] pt-4 flex justify-between font-bold text-white text-lg">
            <span>Total</span>
            <span className="text-brand-400 tabular-nums">
              ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {paymentChoice === 'whatsapp' && (
            <p className="text-xs text-slate-500">
              Al confirmar se abrirá WhatsApp con el detalle del pedido. Un asesor te responderá para coordinar pago y envío.
            </p>
          )}
          <Link to="/products" className="text-xs text-slate-500 hover:text-brand-400 transition-colors block text-center">
            Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  );
};
