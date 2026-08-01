import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import { ProductCard } from '../../components/ecommerce/ProductCard';
import { ProductGridSkeleton } from '../../components/ecommerce/ProductCardSkeleton';
import { HeroCarousel } from '../../components/ecommerce/HeroCarousel';
import { TrustBadges } from '../../components/ecommerce/TrustBadges';
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
  const bannerImages = settings?.bannerImages || [];
  const latestProducts = products.slice(0, 8);

  return (
    <div className="space-y-12 animate-slide-up">
      <SEO
        title={storeName}
        description={settings?.storeDescription || 'Comprá online con envío a todo el país'}
      />

      <HeroCarousel
        images={bannerImages}
        storeName={storeName}
        storeDescription={settings?.storeDescription}
      />

      <TrustBadges
        mercadopagoEnabled={settings?.mercadopagoEnabled}
        envioPackEnabled={settings?.envioPackEnabled}
      />

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
            <ProductGridSkeleton count={4} />
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
          <ProductGridSkeleton count={8} />
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
