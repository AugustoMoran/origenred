import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  useGetCategoriesQuery,
  useGetMySellerListingsQuery,
  useCreateSellerListingMutation,
  useUpdateSellerListingMutation,
} from '../../../services/marketplaceApi';
import { MarketplaceImage } from '../../../components/marketplace/MarketplaceImage';
import { resolveMarketplaceImageUrl } from '../../../utils/marketplaceMediaUrl';
import { extractStorageKeyFromUrl } from '../../../utils/mediaUrlHelpers';

const fieldClass = 'marketplace-field';

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
  supplierName: '',
  supplierProductCode: '',
};

type ListingImage = { url: string; key?: string };

const imageStorageKey = (img: ListingImage) =>
  img.key || extractStorageKeyFromUrl(img.url) || undefined;

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
  const [existingImages, setExistingImages] = useState<ListingImage[]>([]);
  const [removeImageKeys, setRemoveImageKeys] = useState<string[]>([]);
  const [error, setError] = useState('');

  const newImagePreviews = useMemo(
    () => images.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    [images]
  );

  useEffect(() => {
    return () => {
      newImagePreviews.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, [newImagePreviews]);

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
          supplierName: existing.supplierName || '',
          supplierProductCode: existing.supplierProductCode || '',
        });
        setExistingImages(existing.images || []);
        setRemoveImageKeys([]);
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

  const toggleRemoveExisting = (img: ListingImage) => {
    const key = imageStorageKey(img);
    if (!key) {
      setExistingImages((list) => list.filter((item) => item.url !== img.url));
      return;
    }
    setRemoveImageKeys((keys) =>
      keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]
    );
  };

  const isMarkedForRemoval = (img: ListingImage) => {
    const key = imageStorageKey(img);
    return key ? removeImageKeys.includes(key) : false;
  };

  const keptExistingImages = existingImages.filter((img) => !isMarkedForRemoval(img));

  const buildFormData = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    if (isEdit) {
      fd.append('keptImages', JSON.stringify(keptExistingImages));
      if (removeImageKeys.length) {
        fd.append('removeImageKeys', JSON.stringify(removeImageKeys));
      }
    }
    images.forEach((file) => fd.append('images', file));
    return fd;
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
        await updateListing({ id, body: buildFormData() }).unwrap();
      } else {
        await createListing(buildFormData()).unwrap();
      }
      navigate('/vendedor/productos');
    } catch (err: any) {
      const apiMessage =
        err?.data?.message ||
        (typeof err?.data === 'string' ? err.data : undefined);
      if (err?.status === 401) {
        setError(apiMessage || 'Sesión expirada. Volvé a iniciar sesión e intentá de nuevo.');
        return;
      }
      if (err?.status === 403) {
        setError(apiMessage || 'No tenés permiso para publicar con esta cuenta.');
        return;
      }
      setError(apiMessage || 'Error al guardar');
    }
  };

  const loading = creating || updating;

  const renderImageGrid = () => (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-or-navy">Imágenes</label>
      <p className="text-xs text-slate-500">
        Tocá la × para quitar una foto. Al guardar, los cambios se aplican en la publicación.
      </p>

      {(keptExistingImages.length > 0 || newImagePreviews.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {keptExistingImages.map((img) => {
            const displayUrl = resolveMarketplaceImageUrl(img.url, imageStorageKey(img));
            const key = imageStorageKey(img);
            return (
              <div key={img.url} className="relative w-20 h-20 rounded-lg border border-slate-200 overflow-hidden">
                <MarketplaceImage
                  src={displayUrl}
                  storageKey={key}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => toggleRemoveExisting(img)}
                  className="absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-red-600 text-white text-sm leading-none shadow"
                  aria-label="Quitar imagen"
                >
                  ×
                </button>
              </div>
            );
          })}
          {newImagePreviews.map((item, idx) => (
            <div key={`${item.file.name}-${idx}`} className="relative w-20 h-20 rounded-lg border border-brand-500/40 overflow-hidden">
              <img src={item.preview} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImages((files) => files.filter((_, i) => i !== idx))}
                className="absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-red-600 text-white text-sm leading-none shadow"
                aria-label="Quitar imagen nueva"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => {
          const picked = Array.from(e.target.files || []);
          if (picked.length) setImages((prev) => [...prev, ...picked]);
          e.target.value = '';
        }}
        className="text-sm text-slate-500"
      />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold text-or-navy">
        {isEdit ? 'Editar publicación' : 'Nueva publicación'}
      </h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5 text-or-navy">
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

        <Field label="Título *" value={form.title} onChange={set('title')} required />
        <div>
          <label className="block text-sm font-medium text-or-navy mb-1.5">Descripción *</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            required
            rows={4}
            className={`${fieldClass} min-h-[100px] py-3`}
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
              className={fieldClass}
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

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <p className="text-sm font-semibold text-or-navy">Proveedor (opcional)</p>
          <p className="text-xs text-slate-500">
            Solo vos lo ves al gestionar ventas. No se muestra al comprador en la tienda.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nombre proveedor" value={form.supplierName} onChange={set('supplierName')} />
            <Field label="Código en proveedor" value={form.supplierProductCode} onChange={set('supplierProductCode')} />
          </div>
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
          <select value={form.status} onChange={set('status')} className={fieldClass}>
            <option value="draft">Borrador</option>
            <option value="active">Publicar (activa)</option>
            <option value="paused">Pausada</option>
          </select>
        </div>

        {renderImageGrid()}

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
      className={fieldClass}
    />
  </div>
);
