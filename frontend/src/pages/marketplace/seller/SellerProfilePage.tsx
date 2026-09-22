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
    shipStreet: '',
    shipCity: '',
    shipProvince: '',
    shipPostalCode: '',
    envioPackDireccionEnvioId: '',
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
        shipStreet: profile.shipStreet || '',
        shipCity: profile.shipCity || '',
        shipProvince: profile.shipProvince || '',
        shipPostalCode: profile.shipPostalCode || '',
        envioPackDireccionEnvioId: profile.envioPackDireccionEnvioId
          ? String(profile.envioPackDireccionEnvioId)
          : '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await updateProfile({
        ...form,
        envioPackDireccionEnvioId: form.envioPackDireccionEnvioId
          ? Number(form.envioPackDireccionEnvioId)
          : null,
      }).unwrap();
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
            className="marketplace-field px-3 py-2"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Descripción</span>
          <textarea
            className="marketplace-field px-3 py-2 min-h-[100px]"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Contá qué vendés y qué te diferencia"
          />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Teléfono</span>
            <input
              className="marketplace-field px-3 py-2"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Ciudad</span>
            <input
              className="marketplace-field px-3 py-2"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </label>
        </div>
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <p className="text-sm font-semibold text-or-navy">Dirección de despacho y retiro en persona</p>
          <p className="text-xs text-slate-500">
            Se usa para EnvíoPack y para mostrar el punto de retiro a los compradores cuando activás &quot;Permitir
            retiro&quot; en una publicación. Si sos admin de OrigenRed, se usa el depósito configurado en el servidor.
          </p>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Calle y número</span>
            <input
              className="marketplace-field px-3 py-2"
              value={form.shipStreet}
              onChange={(e) => setForm({ ...form, shipStreet: e.target.value })}
              placeholder="Ej. Av. Corrientes 1234"
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Ciudad despacho</span>
              <input
                className="marketplace-field px-3 py-2"
                value={form.shipCity}
                onChange={(e) => setForm({ ...form, shipCity: e.target.value })}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">CP despacho</span>
              <input
                className="marketplace-field px-3 py-2"
                value={form.shipPostalCode}
                onChange={(e) => setForm({ ...form, shipPostalCode: e.target.value })}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Provincia despacho</span>
            <input
              className="marketplace-field px-3 py-2"
              value={form.shipProvince}
              onChange={(e) => setForm({ ...form, shipProvince: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">ID depósito EnvíoPack (opcional)</span>
            <input
              className="marketplace-field px-3 py-2"
              value={form.envioPackDireccionEnvioId}
              onChange={(e) => setForm({ ...form, envioPackDireccionEnvioId: e.target.value })}
              placeholder="Ej. 22 — Configuración > Depósitos en EnvíoPack"
            />
            <span className="text-xs text-slate-500">
              Si la dirección ya está en EnvíoPack con el mismo CP, podemos detectarla sola; si no, copiá el ID del
              depósito.
            </span>
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Provincia</span>
            <input
              className="marketplace-field px-3 py-2"
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Código postal</span>
            <input
              className="marketplace-field px-3 py-2"
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
