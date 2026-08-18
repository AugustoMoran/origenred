import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useLoginMutation } from '../services/authApi';
import { setCredentials } from '../store/authSlice';
import { OrigenRedLogo } from '../components/branding/OrigenRedLogo';
import { NetworkBackdrop } from '../components/branding/NetworkBackdrop';

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
    <div className="min-h-screen flex items-center justify-center bg-[#030712] relative overflow-hidden px-4">
      <NetworkBackdrop variant="dark" />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="glass rounded-2xl p-8 border border-white/10">
          <div className="text-center mb-8">
            <OrigenRedLogo size="xl" className="justify-center mb-4" />
            <h1 className="text-xl font-bold text-white">Ingresar a OrigenRed</h1>
            <p className="text-sm text-slate-400 mt-1">Marketplace y panel de gestión</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <div>
              <label className="section-heading">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label className="section-heading">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
              {isLoading ? 'Iniciando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            ¿Querés comprar en el marketplace?{' '}
            <Link to="/registro" className="text-or-red hover:text-red-400 transition-colors font-medium">
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
