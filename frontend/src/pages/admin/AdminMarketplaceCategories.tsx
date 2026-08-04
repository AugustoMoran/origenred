import React, { useState } from 'react';
import {
  useGetAdminMarketplaceCategoriesQuery,
  useCreateAdminMarketplaceCategoryMutation,
  useUpdateAdminMarketplaceCategoryMutation,
  useDeleteAdminMarketplaceCategoryMutation,
} from '../../services/marketplaceApi';

export const AdminMarketplaceCategories: React.FC = () => {
  const { data: categories = [], refetch } = useGetAdminMarketplaceCategoriesQuery();
  const [createCategory, { isLoading: creating }] = useCreateAdminMarketplaceCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateAdminMarketplaceCategoryMutation();
  const [deleteCategory] = useDeleteAdminMarketplaceCategoryMutation();

  const [form, setForm] = useState({ name: '', icon: '', displayOrder: '0' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', icon: '', displayOrder: '0', isActive: true });
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setError('');
    if (!form.name.trim()) return;
    try {
      await createCategory({
        name: form.name.trim(),
        icon: form.icon.trim() || undefined,
        displayOrder: Number(form.displayOrder) || 0,
      }).unwrap();
      setForm({ name: '', icon: '', displayOrder: '0' });
      refetch();
    } catch (err: any) {
      setError(err?.data?.message || 'Error al crear');
    }
  };

  const startEdit = (cat: any) => {
    setEditingId(cat._id);
    setEditForm({
      name: cat.name,
      icon: cat.icon || '',
      displayOrder: String(cat.displayOrder ?? 0),
      isActive: cat.isActive,
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      await updateCategory({
        id: editingId,
        body: {
          name: editForm.name.trim(),
          icon: editForm.icon.trim() || undefined,
          displayOrder: Number(editForm.displayOrder) || 0,
          isActive: editForm.isActive,
        },
      }).unwrap();
      setEditingId(null);
      refetch();
    } catch (err: any) {
      setError(err?.data?.message || 'Error al actualizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      await deleteCategory(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'No se pudo eliminar');
    }
  };

  const loading = creating || updating;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Categorías Marketplace</h1>
        <p className="text-sm text-slate-500 mt-1">Gestión de categorías para publicaciones de vendedores</p>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Nueva categoría</h2>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex flex-wrap gap-3 items-end">
          <input
            className="input max-w-xs"
            placeholder="Nombre *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="input max-w-[120px]"
            placeholder="Icono (emoji)"
            value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
          />
          <input
            className="input max-w-[100px]"
            type="number"
            placeholder="Orden"
            value={form.displayOrder}
            onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
          />
          <button type="button" className="btn-primary" disabled={loading} onClick={handleCreate}>
            Agregar
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Categoría</th>
              <th className="text-left px-4 py-3">Slug</th>
              <th className="text-left px-4 py-3">Publicaciones</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {categories.map((cat: any) => (
              <tr key={cat._id} className="hover:bg-white/[0.02]">
                {editingId === cat._id ? (
                  <td colSpan={5} className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        className="input max-w-[200px]"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      />
                      <input
                        className="input max-w-[80px]"
                        value={editForm.icon}
                        onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))}
                      />
                      <input
                        className="input max-w-[80px]"
                        type="number"
                        value={editForm.displayOrder}
                        onChange={(e) => setEditForm((f) => ({ ...f, displayOrder: e.target.value }))}
                      />
                      <label className="flex items-center gap-2 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={editForm.isActive}
                          onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                        />
                        Activa
                      </label>
                      <button type="button" className="btn-primary text-xs" onClick={handleUpdate}>
                        Guardar
                      </button>
                      <button type="button" className="btn-secondary text-xs" onClick={() => setEditingId(null)}>
                        Cancelar
                      </button>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3 text-white">
                      {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{cat.slug}</td>
                    <td className="px-4 py-3 text-slate-400">{cat.listingCount ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={cat.isActive ? 'badge-green' : 'badge-gray'}>
                        {cat.isActive ? 'Activa' : 'Oculta'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button
                        type="button"
                        className="text-xs text-brand-400 hover:underline"
                        onClick={() => startEdit(cat)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-400 hover:underline"
                        onClick={() => handleDelete(cat._id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && (
          <p className="text-center text-slate-500 py-8 text-sm">No hay categorías creadas</p>
        )}
      </div>
    </div>
  );
};
