import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetAdminMarketplaceListingsQuery,
  MarketplaceListing,
} from '../../services/marketplaceApi';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activa',
  paused: 'Pausada',
  sold_out: 'Sin stock',
  moderated: 'Moderada',
};

export const AdminMarketplaceListings: React.FC = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isFetching } = useGetAdminMarketplaceListingsQuery({
    page,
    limit: 24,
    status: status || undefined,
    search: search || undefined,
  });

  const listings = data?.items ?? [];
  const pagination = data?.pagination;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Productos Marketplace</h1>
          <p className="text-sm text-slate-500 mt-1">
            Publicaciones de vendedores en OrigenRed (no inventario POS)
          </p>
        </div>
        <Link
          to="/"
          className="text-sm text-brand-400 hover:text-brand-300 hover:underline"
        >
          Ver en la tienda →
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por título, marca..."
            className="input flex-1"
          />
          <button type="submit" className="btn-secondary px-4">Buscar</button>
        </form>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="input sm:w-48"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="draft">Borrador</option>
          <option value="paused">Pausadas</option>
          <option value="sold_out">Sin stock</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-slate-500 text-sm">Cargando productos...</p>
      ) : listings.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <p>No hay publicaciones del marketplace.</p>
          <p className="text-xs mt-2 text-slate-600">
            El inventario POS (Inventario) es distinto — aquí ves lo que venden los vendedores MP.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Producto</th>
                <th className="text-left px-4 py-3">Vendedor</th>
                <th className="text-left px-4 py-3">Precio</th>
                <th className="text-left px-4 py-3">Stock</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {listings.map((listing: MarketplaceListing & {
                status?: string;
                stock?: number;
                seller?: { businessName?: string; slug?: string };
              }) => (
                <tr key={listing._id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={listing.images?.[0]?.url || '/logooficialdefinitivo.png'}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover bg-white/5"
                      />
                      <span className="font-medium text-white line-clamp-1 max-w-[220px]">
                        {listing.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {listing.seller?.businessName || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    ${listing.price?.toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{listing.stock ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="badge">
                      {STATUS_LABELS[listing.status || ''] || listing.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {listing.slug && (
                      <Link
                        to={`/p/${listing.slug}`}
                        className="text-xs text-brand-400 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {pagination.total} productos · página {pagination.page} de {pagination.pages}
            {isFetching && ' · actualizando...'}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary px-3 py-1.5 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
