import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import { ProductCard } from '../../components/ecommerce/ProductCard';
import { useGetStoreProductsQuery } from '../../services/ecommerceApi';
import { useGetPublicSettingsQuery } from '../../services/settingsApi';
import { useTrackEventMutation } from '../../services/analyticsApi';

export const StoreHome: React.FC = () => {
  const { data: settings } = useGetPublicSettingsQuery();
  const { data: featured = [], isLoading: loadingFeatured } = useGetStoreProductsQuery({ featured: true });
  const { data: products = [], isLoading: loadingProducts } = useGetStoreProductsQuery();
  const [trackEvent] = useTrackEventMutation();

  useEffect(() => {
    trackEvent({ event: 'page_view', path: '/' }).catch(() => {});
  }, [trackEvent]);

  const storeName = settings?.storeName || (import.meta as any).env?.VITE_COMPANY_NAME || 'Tienda';
  const latestProducts = products.slice(0, 8);

  return (
    <div className="space-y-12 animate-slide-up">
      <SEO
        title={storeName}
        description={settings?.storeDescription || 'Comprá online con envío a todo el país'}
      />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl card-lg p-8 sm:p-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-30%] right-[-10%] w-[50%] h-[80%] bg-brand-900/25 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-30%] left-[-10%] w-[40%] h-[60%] bg-blue-900/20 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <p className="text-brand-400 text-sm font-semibold mb-2">Bienvenido</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            {storeName}
          </h1>
          <p className="text-slate-400 text-base sm:text-lg mb-8 leading-relaxed">
            {settings?.storeDescription || 'Descubrí nuestros productos con la mejor calidad y precios competitivos.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/products" className="btn-primary">
              Ver catálogo
            </Link>
            {featured.length > 0 && (
              <a href="#destacados" className="btn-secondary">
                Destacados
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section id="destacados" className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Productos destacados</h2>
              <p className="text-sm text-slate-500 mt-1">Selección especial de la semana</p>
            </div>
            <Link to="/products?featured=true" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
              Ver todos →
            </Link>
          </div>
          {loadingFeatured ? (
            <div className="text-slate-500 text-sm py-8 text-center">Cargando destacados...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.slice(0, 4).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Latest products */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Últimos productos</h2>
            <p className="text-sm text-slate-500 mt-1">Novedades del catálogo</p>
          </div>
          <Link to="/products" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Ver catálogo →
          </Link>
        </div>
        {loadingProducts ? (
          <div className="text-slate-500 text-sm py-8 text-center">Cargando productos...</div>
        ) : latestProducts.length === 0 ? (
          <div className="card p-10 text-center text-slate-600 text-sm">
            No hay productos disponibles en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {latestProducts.map((p) => (
              <ProductCard key={p._id} product={p} showFeatured={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
