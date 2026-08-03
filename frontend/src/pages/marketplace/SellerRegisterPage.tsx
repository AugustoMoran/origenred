import React from 'react';
import { Link } from 'react-router-dom';
import { useRegisterSellerMutation } from '../../services/marketplaceApi';
import { SEO } from '../../components/ecommerce/SEO';

export const SellerRegisterPage: React.FC = () => {
  const [registerSeller, { isLoading, isSuccess, error }] = useRegisterSellerMutation();
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    province: '',
    city: '',
    postalCode: '',
    phone: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await registerSeller(form);
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  if (isSuccess) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold text-or-navy">¡Solicitud enviada!</h1>
        <p className="text-slate-500">
          Un administrador revisará tu cuenta. Te avisaremos por email cuando estés aprobado.
        </p>
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
        <p className="text-slate-500">100 publicaciones gratis · Comisión 5% solo al vender</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 space-y-5 shadow-sm">
        {(error as any)?.data?.message && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{(error as any).data.message}</div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tu nombre" value={form.name} onChange={set('name')} required />
          <Field label="Email" type="email" value={form.email} onChange={set('email')} required />
          <Field label="Contraseña" type="password" value={form.password} onChange={set('password')} required />
          <Field label="Nombre del negocio" value={form.businessName} onChange={set('businessName')} required />
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
      </form>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
}> = ({ label, value, onChange, type = 'text', required }) => (
  <div>
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
