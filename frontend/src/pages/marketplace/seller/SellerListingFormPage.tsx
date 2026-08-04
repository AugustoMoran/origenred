import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  useGetCategoriesQuery,
  useGetMySellerListingsQuery,
  useCreateSellerListingMutation,
  useUpdateSellerListingMutation,
} from '../../../services/marketplaceApi';

const emptyForm = {
  title: '',
  description: '',
  shortDescription: '',
  price: '',
  compareAtPrice: '',
  stock: '1',
  category: '',
  brand: '',
  color: '',
  size: '',
  condition: 'new',
  freeShipping: false,
  allowPickup: false,
  status: 'draft',
  weight: '',
};

export const SellerListingFormPage: React.FC = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { profile } = useOutletContext<{ profile?: { status: string } }>();
  const { data: categories = [] } = useGetCategoriesQuery({ all: true });
  const { data: listings = [] } = useGetMySellerListingsQuery(undefined, { skip: !isEdit });
  const [createListing, { isLoading: creating }] = useCreateSellerListingMutation();
  const [updateListing, { isLoading: updating }] = useUpdateSellerListingMutation();

  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<Array<{ url: string }>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && id) {
      const existing = listings.find((l) => l._id === id);
      if (existing) {
        setForm({
          title: existing.title || '',
          description: existing.description || '',
          shortDescription: existing.shortDescription || '',
          price: String(existing.price || ''),
          compareAtPrice: existing.compareAtPrice ? String(existing.compareAtPrice) : '',
          stock: String(existing.stock ?? 1),
          category: typeof existing.category === 'object' ? existing.category?._id || '' : String(existing.category || ''),
          brand: existing.brand || '',
          color: existing.color || '',
          size: existing.size || '',
          condition: 'new',
          freeShipping: existing.freeShipping || false,
          allowPickup: false,
          status: (existing as any).status || 'draft',
          weight: '',
        });
        setExistingImages(existing.images || []);
      }
    }
  }, [isEdit, id, listings]);

  if (profile?.status !== 'approved') {
    return (
      <div className="text-center py-12 text-slate-400">
        Necesitás estar aprobado para publicar productos.
      </div>
    );
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.title || !form.description || !form.price || !form.category) {
      setError('Completá título, descripción, precio y categoría');
      return;
    }

    try {
      if (isEdit && id) {
        if (images.length > 0) {
          const fd = new FormData();
          Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
          images.forEach((file) => fd.append('images', file));
          await updateListing({ id, body: fd }).unwrap();
        } else {
          await updateListing({ id, body: form }).unwrap();
        }
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
        images.forEach((file) => fd.append('images', file));
        await createListing(fd).unwrap();
      }
      navigate('/vendedor/productos');
    } catch (err: any) {
      setError(err?.data?.message || 'Error al guardar');
    }
  };

  const loading = creating || updating;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold text-or-navy">
        {isEdit ? 'Editar publicación' : 'Nueva publicación'}
      </h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

        <Field label="Título *" value={form.title} onChange={set('title')} required />
        <div>
          <label className="block text-sm font-medium text-or-navy mb-1.5">Descripción *</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            required
            rows={4}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-or-blue focus:ring-2 focus:ring-or-blue/10"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Precio (ARS) *" type="number" value={form.price} onChange={set('price')} required />
          <Field label="Precio anterior (opcional)" type="number" value={form.compareAtPrice} onChange={set('compareAtPrice')} />
          <Field label="Stock *" type="number" value={form.stock} onChange={set('stock')} required />
          <div>
            <label className="block text-sm font-medium text-or-navy mb-1.5">Categoría *</label>
            <select
              value={form.category}
              onChange={set('category')}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            >
              <option value="">Seleccionar...</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <Field label="Marca" value={form.brand} onChange={set('brand')} />
          <Field label="Color" value={form.color} onChange={set('color')} />
          <Field label="Talle" value={form.size} onChange={set('size')} />
          <Field label="Peso (kg)" type="number" value={form.weight} onChange={set('weight')} />
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-or-navy cursor-pointer">
            <input type="checkbox" checked={form.freeShipping} onChange={set('freeShipping')} className="rounded" />
            Envío gratis
          </label>
          <label className="flex items-center gap-2 text-sm text-or-navy cursor-pointer">
            <input type="checkbox" checked={form.allowPickup} onChange={set('allowPickup')} className="rounded" />
            Retiro en persona
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-or-navy mb-1.5">Estado</label>
          <select value={form.status} onChange={set('status')} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm">
            <option value="draft">Borrador</option>
            <option value="active">Publicar (activa)</option>
            <option value="paused">Pausada</option>
          </select>
        </div>

        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-or-navy mb-1.5">Imágenes</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setImages(Array.from(e.target.files || []))}
              className="text-sm text-slate-500"
            />
            {images.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">{images.length} imagen(es) seleccionada(s)</p>
            )}
          </div>
        )}

        {isEdit && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-or-navy">Imágenes</label>
            {existingImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {existingImages.map((img) => (
                  <img
                    key={img.url}
                    src={img.url}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                  />
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setImages(Array.from(e.target.files || []))}
              className="text-sm text-slate-500"
            />
            {images.length > 0 && (
              <p className="text-xs text-slate-400">{images.length} nueva(s) imagen(es) a agregar</p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-or-red text-white font-semibold rounded-xl hover:bg-red-600 disabled:opacity-60"
          >
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear publicación'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/vendedor/productos')}
            className="px-6 py-2.5 text-slate-500 hover:text-or-navy"
          >
            Cancelar
          </button>
        </div>
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
