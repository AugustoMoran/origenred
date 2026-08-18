import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useLoginMutation } from '../services/authApi';
import { setCredentials } from '../store/authSlice';
import { OrigenRedLogo } from '../components/branding/OrigenRedLogo';
import { SEO } from '../components/ecommerce/SEO';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      const result = await login({
        email: normalizedEmail,
        password: normalizedPassword,
      }).unwrap();
      dispatch(setCredentials({ user: result.user }));
      const roles: string[] = result?.user?.roles || [];
      const isStaff = roles.some((r) => ['admin', 'vendedor'].includes(String(r).toLowerCase()));
      navigate(isStaff ? '/dashboard' : '/');
    } catch (err: any) {
      setError(err.data?.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    }
  };

  return (
    <div className="max-w-md mx-auto py-4 sm:py-8 animate-fade-in">
      <SEO title="Ingresar" description="Ingresá a tu cuenta de OrigenRed" />

      <div className="text-center mb-6">
        <OrigenRedLogo size="lg" className="justify-center mb-4" />
        <h1 className="text-2xl font-bold text-or-navy">Ingresar a OrigenRed</h1>
        <p className="text-sm text-slate-500 mt-1">Marketplace y panel de gestión</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-or-navy mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-or-blue focus:ring-2 focus:ring-or-blue/10"
            placeholder="tu@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-or-navy mb-1.5">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-or-blue focus:ring-2 focus:ring-or-blue/10"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-or-red hover:bg-red-600 text-white font-semibold rounded-xl disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Iniciando...' : 'Iniciar sesión'}
        </button>

        <p className="text-center text-sm text-slate-500">
          ¿Querés comprar en el marketplace?{' '}
          <Link to="/registro" className="text-or-blue font-medium hover:underline">
            Crear cuenta
          </Link>
        </p>
      </form>
    </div>
  );
};
