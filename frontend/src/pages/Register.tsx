import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRegisterMutation, useGetBootstrapStatusQuery } from '../services/authApi';
import { OrigenRedLogo } from '../components/branding/OrigenRedLogo';
import { NetworkBackdrop } from '../components/branding/NetworkBackdrop';

export const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [register, { isLoading }] = useRegisterMutation();
  const { data: bootstrap, isLoading: loadingBootstrap } = useGetBootstrapStatusQuery();
  const navigate = useNavigate();

  const adminExists = bootstrap?.adminExists === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      await register({
        email: normalizedEmail,
        password: normalizedPassword,
        roles: ['admin'],
      }).unwrap();
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      const message = err?.data?.message as string | undefined;
      setError(message || 'Error al registrar usuario.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] relative overflow-hidden px-4">
      <NetworkBackdrop variant="dark" />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="glass rounded-2xl p-8 border border-white/10">
          <div className="text-center mb-8">
            <OrigenRedLogo size="xl" className="justify-center mb-4" />
            <h1 className="text-xl font-bold text-white">Crear cuenta</h1>
            <p className="text-sm text-slate-400 mt-1">
              {adminExists ? 'Registro en OrigenRed' : 'Configuración inicial de administrador'}
            </p>
          </div>

          {loadingBootstrap ? (
            <p className="text-center text-slate-500 text-sm py-8">Cargando...</p>
          ) : adminExists ? (
            <div className="space-y-4">
              <div className="bg-or-red/10 border border-or-red/25 text-red-300 p-4 rounded-xl text-sm leading-relaxed">
                Ya hay un administrador configurado. Para comprar en el marketplace creá una cuenta de comprador, o
                ingresá si ya tenés acceso al panel.
              </div>
              <Link
                to="/login"
                className="btn-primary w-full flex justify-center"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/registro"
                className="btn-secondary w-full flex justify-center"
              >
                Crear cuenta de comprador
              </Link>
              <p className="text-xs text-slate-500 text-center">
                Admin demo: <span className="text-slate-400">admin@origenred.com.ar</span>
              </p>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white font-semibold">Cuenta creada</p>
              <p className="text-sm text-slate-500">Redirigiendo al login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="section-heading">Email administrador</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="admin@origenred.com.ar"
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
                {isLoading ? 'Creando...' : 'Crear administrador'}
              </button>
            </form>
          )}

          {!adminExists && !success && (
            <p className="text-center text-sm text-slate-600 mt-6">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="text-or-red hover:text-red-400 transition-colors">Iniciar sesión</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
