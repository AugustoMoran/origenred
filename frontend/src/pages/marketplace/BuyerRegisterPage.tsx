import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { SEO } from '../../components/ecommerce/SEO';
import { usePublicRegisterMutation, useLoginMutation } from '../../services/authApi';
import { setCredentials } from '../../store/authSlice';

export const BuyerRegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [publicRegister, { isLoading: registering }] = usePublicRegisterMutation();
  const [login, { isLoading: loggingIn }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await publicRegister({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      }).unwrap();

      const result = await login({
        email: email.trim().toLowerCase(),
        password,
      }).unwrap();

      if (result.user) {
        dispatch(setCredentials({ user: result.user }));
        navigate('/');
      }
    } catch (err: any) {
      setError(err?.data?.message || 'Error al crear la cuenta');
    }
  };

  const loading = registering || loggingIn;

  return (
    <div className="max-w-md mx-auto py-8 animate-fade-in">
      <SEO title="Crear cuenta" description="Registrate en OrigenRed para comprar y chatear con vendedores" />

      <h1 className="text-2xl font-bold text-or-navy mb-2">Crear cuenta</h1>
      <p className="text-sm text-slate-500 mb-6">
        Comprá en el marketplace y seguí tus pedidos
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-or-navy mb-1.5">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-or-navy mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-or-navy mb-1.5">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-or-red hover:bg-red-600 text-white font-semibold rounded-xl disabled:opacity-50"
        >
          {loading ? 'Creando cuenta...' : 'Registrarse'}
        </button>

        <p className="text-center text-sm text-slate-500">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-or-blue font-medium hover:underline">Ingresar</Link>
        </p>
        <p className="text-center text-sm text-slate-500">
          ¿Querés vender?{' '}
          <Link to="/vender" className="text-or-red font-medium hover:underline">Registrate como vendedor</Link>
        </p>
      </form>
    </div>
  );
};
