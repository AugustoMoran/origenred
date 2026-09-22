import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { MarketplaceListing, useGetFavoritesQuery, useToggleFavoriteMutation } from '../../services/marketplaceApi';
import { RootState } from '../../store';
import { addMarketplaceItem, setMarketplaceCartOpen } from '../../store/marketplaceCartSlice';
import { resolveMarketplaceImageUrl } from '../../utils/marketplaceMediaUrl';
import { MarketplaceImage } from './MarketplaceImage';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(price);

interface Props {
  listing: MarketplaceListing;
}

export const MarketplaceListingCard: React.FC<Props> = ({ listing }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { data: favorites = [] } = useGetFavoritesQuery(undefined, { skip: !user });
  const [toggleFavorite] = useToggleFavoriteMutation();
  const [addedFlash, setAddedFlash] = useState(false);
  const reduce = useReducedMotion();

  const isFavorited = favorites.some((f) => f.listing?._id === listing._id);
  const primaryImage = listing.images?.[0];
  const imageUrl = resolveMarketplaceImageUrl(primaryImage?.url, primaryImage?.key);
  const hasDiscount = listing.compareAtPrice && listing.compareAtPrice > listing.price;
  const outOfStock = (listing.stock ?? 0) <= 0;

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    toggleFavorite(listing._id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    dispatch(
      addMarketplaceItem({
        listingId: listing._id,
        slug: listing.slug,
        title: listing.title,
        price: listing.price,
        quantity: 1,
        imageUrl: resolveMarketplaceImageUrl(primaryImage?.url, primaryImage?.key),
        sellerId: listing.seller?._id || '',
        sellerName: listing.seller?.businessName || 'Vendedor',
        maxStock: listing.stock,
      })
    );
    setAddedFlash(true);
    dispatch(setMarketplaceCartOpen(true));
    window.setTimeout(() => setAddedFlash(false), 1500);
  };

  return (
    <motion.div
      className="group relative bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg hover:border-or-red/20 transition-[box-shadow,border-color] duration-300"
      whileHover={reduce ? undefined : { y: -5, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
    >
      <Link to={`/p/${listing.slug}`} className="block">
        <div className="aspect-square bg-slate-50 overflow-hidden relative">
          <MarketplaceImage
            src={imageUrl}
            storageKey={primaryImage?.key}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {user && (
            <button
              type="button"
              onClick={handleFavorite}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-10"
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
          {hasDiscount && (
            <span className="absolute top-2 left-2 bg-or-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Oferta
            </span>
          )}
        </div>
        <div className="p-4 pr-14 space-y-1.5">
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

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={outOfStock}
        title={outOfStock ? 'Sin stock' : 'Agregar al carrito'}
        aria-label={outOfStock ? 'Sin stock' : 'Agregar al carrito'}
        className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all z-10 ${
          outOfStock
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : addedFlash
              ? 'bg-emerald-600 text-white scale-110'
              : 'bg-or-red text-white hover:bg-red-600 hover:scale-105'
        }`}
      >
        {addedFlash ? (
          <span className="text-lg leading-none">✓</span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 6h15l-1.5 9h-12L6 6z" />
            <path d="M6 6L5 3H2" />
            <circle cx="9" cy="20" r="1" />
            <circle cx="18" cy="20" r="1" />
          </svg>
        )}
      </button>
    </motion.div>
  );
};
