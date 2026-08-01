import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import { ProductCard } from '../../components/ecommerce/ProductCard';
import { useGetStoreProductsQuery, useGetStoreCategoriesQuery } from '../../services/ecommerceApi';
import { useTrackEventMutation } from '../../services/analyticsApi';

export const StoreProducts: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const category = searchParams.get('category') || '';
  const featuredOnly = searchParams.get('featured') === 'true';

  const { data: products = [], isLoading } = useGetStoreProductsQuery({
    search: searchParams.get('search') || undefined,
    category: category || undefined,
    featured: featuredOnly || undefined,
  });
  const { data: categories = [] } = useGetStoreCategoriesQuery();
  const [trackEvent] = useTrackEventMutation();

  useEffect(() => {
    trackEvent({ event: 'page_view', path: '/products' }).catch(() => {});
  }, [trackEvent]);

  const categoryOptions = useMemo(() => {
    const fromApi = categories.map((c) => c.name);
    const fromProducts = products.map((p) => p.category).filter(Boolean);
    return Array.from(new Set([...fromApi, ...fromProducts])).sort();
  }, [categories, products]);

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (search.trim()) next.set('search', search.trim());
    else next.delete('search');
    setSearchParams(next);
  };

  const setCategory = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('category', value);
    else next.delete('category');
    setSearchParams(next);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <SEO title="Productos" description="Catálogo completo de productos" />

      <div>
        <h1 className="page-title">Productos</h1>
        <p className="page-sub">Explorá nuestro catálogo completo</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <form onSubmit={applySearch} className="flex-1 relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            className="input pl-12"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <select className="input lg:w-56" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {featuredOnly && (
        <span className="badge-blue">Mostrando solo destacados</span>
      )}

      {isLoading ? (
        <div className="text-slate-500 text-sm py-12 text-center">Cargando productos...</div>
      ) : products.length === 0 ? (
        <div className="card p-12 text-center text-slate-600 text-sm">
          No se encontraron productos con los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
};
