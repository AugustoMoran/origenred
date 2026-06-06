import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRegisterMutation } from '../services/authApi';

const brandLogo = '/brand-logo.png';

export const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [register, { isLoading }] = useRegisterMutation();
  const navigate = useNavigate();

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
      const status = err?.status;
      const message = err?.data?.message as string | undefined;

      if (status === 401 || message === 'Missing auth') {
        setError('Ya existe un administrador. Iniciá sesión con tu cuenta.');
        return;
      }

      setError(message || 'Error al registrar usuario.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] relative overflow-hidden px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-900/15 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-900/20 rounded-full blur-[160px]" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="glass rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-white/90 mx-auto mb-4 flex items-center justify-center shadow-glow-md ring-1 ring-white/30 overflow-hidden">
              <img src={brandLogo} alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-xl font-bold text-white">Crear cuenta</h1>
            <p className="text-sm text-slate-500 mt-1">Configuración inicial de administrador</p>
          </div>

          {success ? (
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
                <label className="section-heading">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input" placeholder="admin@empresa.com" required />
              </div>

              <div>
                <label className="section-heading">Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="input" placeholder="••••••••" required />
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creando...
                  </span>
                ) : 'Crear cuenta'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-slate-600 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 transition-colors">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
