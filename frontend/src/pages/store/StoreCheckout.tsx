import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { SEO } from '../../components/ecommerce/SEO';
import { selectCartItems, selectCartTotal, clearCart } from '../../store/cartSlice';
import { useCreateStoreOrderMutation } from '../../services/ecommerceApi';
import { useGetMercadoPagoConfigQuery, useCreatePreferenceMutation } from '../../services/paymentsApi';
import { useTrackEventMutation } from '../../services/analyticsApi';

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
    paymentMethod: 'transferencia',
  });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
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
        paymentMethod: form.paymentMethod,
      }).unwrap();

      trackEvent({ event: 'purchase', metadata: { orderId: order._id, total } }).catch(() => {});

      if (form.paymentMethod === 'mercadopago' && mpEnabled) {
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
      }

      dispatch(clearCart());
      navigate(`/checkout/confirmation/${order._id}`);
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
        <p className="page-sub">Completá tus datos para finalizar la compra</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-3 card p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">{error}</div>
          )}

          <h2 className="text-sm font-semibold text-white">Datos de contacto</h2>
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
            <label className="section-heading">Método de pago</label>
            <select className="input" value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
              <option value="transferencia">Transferencia bancaria</option>
              <option value="efectivo">Efectivo contra entrega</option>
              {mpEnabled && <option value="mercadopago">Mercado Pago</option>}
              <option value="tarjeta">Tarjeta (coordinar)</option>
            </select>
            {form.paymentMethod === 'mercadopago' && mpEnabled && (
              <p className="text-xs text-slate-500 mt-1">
                Serás redirigido a Mercado Pago para completar el pago de forma segura.
              </p>
            )}
          </div>

          <div>
            <label className="section-heading">Notas (opcional)</label>
            <textarea className="input min-h-[80px]" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
            {isLoading
              ? 'Procesando...'
              : form.paymentMethod === 'mercadopago' && mpEnabled
                ? 'Ir a Mercado Pago'
                : 'Confirmar pedido'}
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
          <Link to="/products" className="text-xs text-slate-500 hover:text-brand-400 transition-colors block text-center">
            Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  );
};
