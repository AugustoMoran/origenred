import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MarketplaceListing, useGetFavoritesQuery, useToggleFavoriteMutation } from '../../services/marketplaceApi';
import { RootState } from '../../store';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(price);

interface Props {
  listing: MarketplaceListing;
}

export const MarketplaceListingCard: React.FC<Props> = ({ listing }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { data: favorites = [] } = useGetFavoritesQuery(undefined, { skip: !user });
  const [toggleFavorite] = useToggleFavoriteMutation();

  const isFavorited = favorites.some((f) => f.listing?._id === listing._id);
  const imageUrl = listing.images?.[0]?.url || '/origenred-logo.png';
  const hasDiscount = listing.compareAtPrice && listing.compareAtPrice > listing.price;

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    toggleFavorite(listing._id);
  };

  return (
    <Link
      to={`/p/${listing.slug}`}
      className="group block bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg hover:border-or-red/20 transition-all duration-300"
    >
      <div className="aspect-square bg-slate-50 overflow-hidden relative">
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {user && (
          <button
            onClick={handleFavorite}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
            aria-label="Favorito"
          >
            <span className={isFavorited ? 'text-or-red' : 'text-slate-400'}>{isFavorited ? '♥' : '♡'}</span>
          </button>
        )}
        {listing.freeShipping && (
          <span className="absolute top-2 left-2 bg-or-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Envío gratis
          </span>
        )}
        {hasDiscount && !user && (
          <span className="absolute top-2 right-2 bg-or-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Oferta
          </span>
        )}
      </div>
      <div className="p-4 space-y-1.5">
        <p className="text-xs text-slate-400 truncate">{listing.seller?.businessName}</p>
        <h3 className="text-sm font-semibold text-or-navy line-clamp-2 group-hover:text-or-red transition-colors">
          {listing.title}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-or-navy">{formatPrice(listing.price)}</span>
          {hasDiscount && (
            <span className="text-xs text-slate-400 line-through">{formatPrice(listing.compareAtPrice!)}</span>
          )}
        </div>
        {listing.origenRankScore >= 70 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-or-blue">
            ⭐ OrigenRank {listing.origenRankScore}
          </span>
        )}
      </div>
    </Link>
  );
};
