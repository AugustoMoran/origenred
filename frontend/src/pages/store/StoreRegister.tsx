import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { SEO } from '../../components/ecommerce/SEO';
import { useRegisterMutation } from '../../services/authApi';
import { setCredentials } from '../../store/authSlice';

const brandLogo = '/brand-logo.png';

export const StoreRegister: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [register, { isLoading }] = useRegisterMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        roles: ['user'],
      }).unwrap();

      if (result?.user) {
        dispatch(setCredentials({ user: result.user }));
        navigate('/');
        return;
      }

      navigate('/login');
    } catch (err: any) {
      setError(err?.data?.message || 'Error al crear la cuenta');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-slide-up">
      <SEO title="Crear cuenta" description="Registrate para comprar en la tienda" />

      <div className="w-full max-w-sm">
        <div className="glass rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-white/90 mx-auto mb-4 flex items-center justify-center shadow-glow-md ring-1 ring-white/30 overflow-hidden">
              <img src={brandLogo} alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-xl font-bold text-white">Crear cuenta</h1>
            <p className="text-sm text-slate-500 mt-1">Registrate para comprar online</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">{error}</div>
            )}

            <div>
              <label className="section-heading">Nombre</label>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <label className="section-heading">Email</label>
              <input type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div>
              <label className="section-heading">Contraseña</label>
              <input type="password" className="input" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
              {isLoading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-6">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 transition-colors">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
