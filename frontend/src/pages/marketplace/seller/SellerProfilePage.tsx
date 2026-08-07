import React, { useEffect, useState } from 'react';
import {
  useGetMySellerProfileQuery,
  useUpdateSellerProfileMutation,
} from '../../../services/marketplaceApi';

export const SellerProfilePage: React.FC = () => {
  const { data: profile, isLoading } = useGetMySellerProfileQuery();
  const [updateProfile, { isLoading: saving }] = useUpdateSellerProfileMutation();
  const [form, setForm] = useState({
    businessName: '',
    description: '',
    province: '',
    city: '',
    postalCode: '',
    phone: '',
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        businessName: profile.businessName || '',
        description: profile.description || '',
        province: profile.province || '',
        city: profile.city || '',
        postalCode: profile.postalCode || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await updateProfile(form).unwrap();
      setFeedback('Perfil actualizado correctamente.');
    } catch (err: any) {
      setFeedback(err?.data?.message || 'No se pudo guardar el perfil');
    }
  };

  if (isLoading) return <p className="text-slate-500">Cargando perfil...</p>;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-or-navy">Mi perfil de vendedor</h2>
        <p className="text-sm text-slate-500 mt-1">
          Un perfil completo mejora tu salud de cuenta y la confianza de compradores.
        </p>
      </div>

      {feedback && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3 rounded-xl">
          {feedback}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Nombre de tienda</span>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Descripción</span>
          <textarea
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm min-h-[100px]"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Contá qué vendés y qué te diferencia"
          />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Teléfono</span>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Ciudad</span>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Provincia</span>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Código postal</span>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-or-red text-white text-sm font-semibold rounded-xl disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
};
