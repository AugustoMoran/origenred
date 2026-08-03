import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import { MarketplaceListingCard } from '../../components/marketplace/MarketplaceListingCard';
import { ProductGridSkeleton } from '../../components/ecommerce/ProductCardSkeleton';
import { useGetListingsQuery, useGetCategoriesQuery } from '../../services/marketplaceApi';

export const MarketplaceSearchPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const search = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || '';

  const { data, isLoading } = useGetListingsQuery({
    search: search || undefined,
    category: category || undefined,
    sort: sort || undefined,
    limit: 24,
  });
  const { data: categories = [] } = useGetCategoriesQuery();

  return (
    <div className="space-y-6">
      <SEO title={search ? `Buscar: ${search}` : 'Explorar productos'} />

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold text-or-navy">
          {search ? `Resultados para "${search}"` : 'Explorar productos'}
        </h1>
        <select
          value={sort}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value) next.set('sort', e.target.value);
            else next.delete('sort');
            setParams(next);
          }}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white"
        >
          <option value="">OrigenRank (recomendado)</option>
          <option value="price_asc">Menor precio</option>
          <option value="price_desc">Mayor precio</option>
          <option value="newest">Más nuevos</option>
          <option value="bestseller">Más vendidos</option>
        </select>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => {
              const next = new URLSearchParams(params);
              next.delete('category');
              setParams(next);
            }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !category ? 'bg-or-navy text-white border-or-navy' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set('category', cat._id);
                setParams(next);
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                category === cat._id ? 'bg-or-navy text-white border-or-navy' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <ProductGridSkeleton count={8} />
      ) : data?.items?.length ? (
        <>
          <p className="text-sm text-slate-400">{data.pagination.total} productos encontrados</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.items.map((listing) => (
              <MarketplaceListingCard key={listing._id} listing={listing} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-400">No se encontraron productos</p>
        </div>
      )}
    </div>
  );
};
