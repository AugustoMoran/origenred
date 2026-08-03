import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import { MarketplaceListingCard } from '../../components/marketplace/MarketplaceListingCard';
import { ProductGridSkeleton } from '../../components/ecommerce/ProductCardSkeleton';
import { useGetHomeDataQuery } from '../../services/marketplaceApi';

export const OrigenRedHome: React.FC = () => {
  const { data, isLoading } = useGetHomeDataQuery();

  return (
    <div className="space-y-14 animate-fade-in">
      <SEO
        title="OrigenRed — Marketplace Argentino"
        description="Comprá y vendé en el marketplace argentino. Publicación gratuita, comisión solo cuando vendés."
      />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-or-navy via-or-blue to-or-navy text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-or-red rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="relative px-6 py-16 sm:py-20 sm:px-12 max-w-3xl">
          <p className="text-or-red font-semibold text-sm tracking-widest uppercase mb-3">
            Marketplace Argentino
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-4">
            Conectamos orígenes,<br />
            <span className="text-or-red">creamos oportunidades</span>
          </h1>
          <p className="text-blue-100 text-base sm:text-lg mb-8 max-w-xl">
            Publicá gratis. Pagá comisión solo cuando vendés. Comprá con confianza en toda Argentina.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/buscar"
              className="inline-flex items-center px-6 py-3 bg-or-red hover:bg-red-600 text-white font-semibold rounded-xl shadow-lg transition-all hover:scale-[1.02]"
            >
              Explorar productos
            </Link>
            <Link
              to="/vender"
              className="inline-flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all"
            >
              Empezar a vender
            </Link>
          </div>
        </div>
      </section>

      {/* Categorías */}
      {data?.categories && data.categories.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-or-navy mb-4">Categorías</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {data.categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/buscar?category=${cat._id}`}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-xl hover:border-or-blue/30 hover:shadow-sm transition-all text-sm font-medium text-or-navy"
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                <span className="text-xs text-slate-400">({cat.listingCount})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Destacados OrigenRank */}
      <ProductSection
        title="Recomendados para vos"
        subtitle="Seleccionados por OrigenRank™"
        listings={data?.featured}
        isLoading={isLoading}
        linkTo="/buscar?sort=origenrank"
      />

      {/* Más vendidos */}
      <ProductSection
        title="Lo más vendido"
        subtitle="Favoritos de la comunidad"
        listings={data?.bestsellers}
        isLoading={isLoading}
        linkTo="/buscar?sort=bestseller"
      />

      {/* Nuevos */}
      <ProductSection
        title="Recién publicados"
        subtitle="Descubrí las últimas novedades"
        listings={data?.newest}
        isLoading={isLoading}
        linkTo="/buscar?sort=newest"
      />

      {/* CTA vendedores */}
      <section className="bg-slate-50 rounded-3xl p-8 sm:p-12 text-center border border-slate-100">
        <h2 className="text-2xl font-bold text-or-navy mb-2">¿Tenés algo para vender?</h2>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">
          Hasta 100 publicaciones gratis. Comisión del 5% solo cuando concretás una venta.
        </p>
        <Link
          to="/vender"
          className="inline-flex items-center px-8 py-3 bg-or-navy hover:bg-or-blue text-white font-semibold rounded-xl transition-colors"
        >
          Crear cuenta de vendedor
        </Link>
      </section>
    </div>
  );
};

const ProductSection: React.FC<{
  title: string;
  subtitle: string;
  listings?: Array<any>;
  isLoading: boolean;
  linkTo: string;
}> = ({ title, subtitle, listings, isLoading, linkTo }) => (
  <section className="space-y-5">
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-or-navy">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <Link to={linkTo} className="text-sm text-or-red hover:text-red-600 font-medium transition-colors">
        Ver todos →
      </Link>
    </div>
    {isLoading ? (
      <ProductGridSkeleton count={4} />
    ) : listings && listings.length > 0 ? (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {listings.slice(0, 8).map((listing) => (
          <MarketplaceListingCard key={listing._id} listing={listing} />
        ))}
      </div>
    ) : (
      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <p className="text-slate-400 text-sm">Pronto habrá productos aquí</p>
      </div>
    )}
  </section>
);
