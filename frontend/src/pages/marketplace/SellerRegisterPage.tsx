import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  useRegisterSellerMutation,
  useApplySellerMutation,
} from '../../services/marketplaceApi';
import { useRefreshMutation } from '../../services/authApi';
import { setUser } from '../../store/authSlice';
import { RootState } from '../../store';
import { SEO } from '../../components/ecommerce/SEO';
import { formatCommissionLine, useMarketplaceCommission } from '../../hooks/useMarketplaceCommission';

export const SellerRegisterPage: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const commission = useMarketplaceCommission();
  const [registerSeller, { isLoading: registering, isSuccess, error: registerError }] =
    useRegisterSellerMutation();
  const [applySeller, { isLoading: applying, isSuccess: applySuccess, error: applyError }] =
    useApplySellerMutation();
  const [refresh] = useRefreshMutation();

  const [form, setForm] = React.useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    businessName: '',
    province: '',
    city: '',
    postalCode: '',
    phone: '',
    description: '',
  });

  React.useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, name: user.name || f.name, email: user.email || f.email }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      const result = await applySeller({
        businessName: form.businessName,
        province: form.province,
        city: form.city,
        postalCode: form.postalCode,
        phone: form.phone,
        description: form.description,
      });
      if (!('error' in result)) {
        try {
          const refreshed = await refresh().unwrap();
          dispatch(setUser(refreshed.user));
        } catch {
          /* sesión sigue válida; roles se actualizan al reingresar */
        }
      }
      return;
    }
    await registerSeller(form);
  };

  const isLoading = registering || applying;
  const success = isSuccess || applySuccess;
  const error = registerError || applyError;
  const errorMessage =
    (error as { data?: { message?: string } })?.data?.message ||
    (user ? undefined : 'Revisá los datos del formulario');

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold text-or-navy">¡Solicitud enviada!</h1>
        <p className="text-slate-500">
          Un administrador revisará tu cuenta. Te avisaremos por email cuando estés aprobado.
        </p>
        {user && (
          <Link to="/vendedor" className="inline-block mt-2 text-or-red font-medium hover:underline">
            Ir al panel vendedor
          </Link>
        )}
        <Link to="/" className="inline-block mt-4 text-or-red font-medium hover:underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <SEO title="Vender en OrigenRed" description="Registrate como vendedor en OrigenRed" />
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-or-navy">Vendé en OrigenRed</h1>
        <p className="text-slate-500">{formatCommissionLine(commission)}</p>
      </div>

      {user && (
        <div className="bg-blue-50 border border-blue-100 text-blue-900 text-sm px-4 py-3 rounded-xl">
          Estás logueado como <strong>{user.email}</strong>. Completá los datos de tu negocio; no hace falta crear otra
          cuenta.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 space-y-5 shadow-sm">
        {errorMessage && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{errorMessage}</div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {!user && (
            <>
              <Field label="Tu nombre" value={form.name} onChange={set('name')} required />
              <Field label="Email" type="email" value={form.email} onChange={set('email')} required />
              <Field label="Contraseña" type="password" value={form.password} onChange={set('password')} required />
            </>
          )}
          <Field
            label="Nombre del negocio"
            value={form.businessName}
            onChange={set('businessName')}
            required
            className={!user ? '' : 'sm:col-span-2'}
          />
          <Field label="Provincia" value={form.province} onChange={set('province')} />
          <Field label="Ciudad" value={form.city} onChange={set('city')} />
          <Field label="Código postal" value={form.postalCode} onChange={set('postalCode')} />
          <Field label="Teléfono" value={form.phone} onChange={set('phone')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-or-navy mb-1.5">Descripción del negocio</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-or-blue focus:ring-2 focus:ring-or-blue/10"
            placeholder="Contanos qué vendés..."
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-or-red hover:bg-red-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
        >
          {isLoading ? 'Enviando...' : 'Solicitar cuenta de vendedor'}
        </button>
        <p className="text-xs text-slate-400 text-center">
          Tu cuenta será revisada manualmente antes de poder publicar.
        </p>
        {!user && (
          <p className="text-xs text-slate-500 text-center">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-or-red font-medium hover:underline">
              Iniciá sesión
            </Link>{' '}
            y volvé a esta página para solicitar vendedor sin repetir email.
          </p>
        )}
      </form>
    </div>
  );

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  className?: string;
}> = ({ label, value, onChange, type = 'text', required, className }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-or-navy mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-or-blue focus:ring-2 focus:ring-or-blue/10"
    />
  </div>
);
