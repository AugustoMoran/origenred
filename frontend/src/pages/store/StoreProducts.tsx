import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import { ProductCard } from '../../components/ecommerce/ProductCard';
import { ProductGridSkeleton } from '../../components/ecommerce/ProductCardSkeleton';
import { useGetStoreProductsPageQuery, useGetStoreCategoriesQuery, StoreProduct } from '../../services/ecommerceApi';
import { useTrackEventMutation } from '../../services/analyticsApi';

const PAGE_SIZE = 12;

export const StoreProducts: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const category = searchParams.get('category') || '';
  const featuredOnly = searchParams.get('featured') === 'true';
  const searchTerm = searchParams.get('search') || undefined;

  const [page, setPage] = useState(1);
  const [allProducts, setAllProducts] = useState<StoreProduct[]>([]);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const filtersKey = `${searchTerm || ''}|${category}|${featuredOnly}`;

  useEffect(() => {
    setPage(1);
    setAllProducts([]);
  }, [filtersKey]);

  const { data, isLoading, isFetching } = useGetStoreProductsPageQuery({
    search: searchTerm,
    category: category || undefined,
    featured: featuredOnly || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const { data: categories = [] } = useGetStoreCategoriesQuery();
  const [trackEvent] = useTrackEventMutation();

  useEffect(() => {
    trackEvent({ event: 'page_view', path: '/products' }).catch(() => {});
  }, [trackEvent]);

  useEffect(() => {
    if (!data?.items) return;
    setAllProducts((prev) => {
      if (page === 1) return data.items;
      const existing = new Set(prev.map((p) => p._id));
      const merged = [...prev];
      data.items.forEach((item) => {
        if (!existing.has(item._id)) merged.push(item);
      });
      return merged;
    });
  }, [data, page]);

  const hasMore = data ? page < data.pagination.pages : false;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore || isFetching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isFetching, allProducts.length]);

  const categoryOptions = useMemo(() => {
    const fromApi = categories.map((c) => c.name);
    const fromProducts = allProducts.map((p) => p.category).filter(Boolean);
    return Array.from(new Set([...fromApi, ...fromProducts])).sort();
  }, [categories, allProducts]);

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

  const showInitialLoading = isLoading && page === 1 && allProducts.length === 0;

  return (
    <div className="space-y-6 animate-slide-up">
      <SEO title="Productos" description="Catálogo completo de productos" />

      <div>
        <h1 className="page-title">Productos</h1>
        <p className="page-sub">
          Explorá nuestro catálogo completo
          {data?.pagination?.total ? (
            <span className="text-slate-600"> · {data.pagination.total} productos</span>
          ) : null}
        </p>
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

      {showInitialLoading ? (
        <ProductGridSkeleton count={8} />
      ) : allProducts.length === 0 ? (
        <div className="card p-12 text-center text-slate-600 text-sm">
          No se encontraron productos con los filtros seleccionados.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>

          <div ref={loadMoreRef} className="py-6 flex justify-center">
            {isFetching && hasMore && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-400 rounded-full animate-spin" />
                Cargando más productos...
              </div>
            )}
            {!hasMore && allProducts.length > 0 && (
              <p className="text-xs text-slate-600">Mostraste todos los productos</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
