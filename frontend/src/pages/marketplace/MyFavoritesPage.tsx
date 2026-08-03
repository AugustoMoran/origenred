import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import { MarketplaceListingCard } from '../../components/marketplace/MarketplaceListingCard';
import { useGetFavoritesQuery } from '../../services/marketplaceApi';

export const MyFavoritesPage: React.FC = () => {
  const { data: favorites = [], isLoading } = useGetFavoritesQuery();

  const listings = favorites.map((f) => f.listing).filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SEO title="Mis favoritos — OrigenRed" />
      <h1 className="text-2xl font-bold text-or-navy">Mis favoritos</h1>

      {isLoading ? (
        <p className="text-slate-400">Cargando...</p>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-400 mb-4">No tenés favoritos guardados</p>
          <Link to="/buscar" className="text-or-red font-medium hover:underline">
            Explorar productos →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((listing: any) => (
            <MarketplaceListingCard key={listing._id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
};
