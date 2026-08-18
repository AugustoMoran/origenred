import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  useGetMySellerListingsQuery,
  useDeleteSellerListingMutation,
  MarketplaceListing,
} from '../../../services/marketplaceApi';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activa',
  paused: 'Pausada',
  sold_out: 'Sin stock',
  moderated: 'Moderada',
};

export const SellerListingsPage: React.FC = () => {
  const { profile } = useOutletContext<{ profile?: { status: string } }>();
  const { data: listings = [], isLoading } = useGetMySellerListingsQuery();
  const [deleteListing] = useDeleteSellerListingMutation();

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Eliminar "${title}"?`)) return;
    await deleteListing(id);
  };

  if (isLoading) return <p className="text-slate-400">Cargando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-or-navy">Mis productos</h2>
        {profile?.status === 'approved' && (
          <Link
            to="/vendedor/productos/nuevo"
            className="px-4 py-2 bg-or-red text-white text-sm font-semibold rounded-xl hover:bg-red-600"
          >
            + Nueva publicación
          </Link>
        )}
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-400 mb-4">Todavía no tenés publicaciones</p>
          {profile?.status === 'approved' && (
            <Link to="/vendedor/productos/nuevo" className="text-or-red font-medium hover:underline">
              Crear la primera →
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Producto</th>
                <th className="text-left px-4 py-3">Precio</th>
                <th className="text-left px-4 py-3">Stock</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3">OrigenRank</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {listings.map((listing: MarketplaceListing & { status?: string; stock?: number }) => (
                <tr key={listing._id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={listing.images?.[0]?.url || '/logooficialdefinitivo.png'}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                      />
                      <span className="font-medium text-or-navy line-clamp-1">{listing.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-or-navy">
                    ${listing.price?.toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-3">{listing.stock ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {STATUS_LABELS[listing.status || ''] || listing.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-or-blue font-medium">{listing.origenRankScore}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link
                      to={`/vendedor/productos/${listing._id}/editar`}
                      className="text-or-blue hover:underline text-xs"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(listing._id, listing.title)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
