import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { SEO } from '../../components/ecommerce/SEO';
import { useGetListingBySlugQuery, useToggleFavoriteMutation } from '../../services/marketplaceApi';
import { RootState } from '../../store';
import { addMarketplaceItem, setMarketplaceCartOpen } from '../../store/marketplaceCartSlice';
import { ReportListingModal } from '../../components/marketplace/MarketplaceReportModal';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const MarketplaceListingDetail: React.FC = () => {
  const { slug = '' } = useParams();
  const dispatch = useDispatch();
  const { data: listing, isLoading, error } = useGetListingBySlugQuery(slug);
  const { user } = useSelector((state: RootState) => state.auth);
  const [toggleFavorite] = useToggleFavoriteMutation();
  const [added, setAdded] = React.useState(false);
  const [showReport, setShowReport] = React.useState(false);

  const handleAddToCart = () => {
    if (!listing || listing.stock <= 0) return;
    dispatch(
      addMarketplaceItem({
        listingId: listing._id,
        slug: listing.slug,
        title: listing.title,
        price: listing.price,
        quantity: 1,
        imageUrl: listing.images?.[0]?.url,
        sellerId: listing.seller?._id || '',
        sellerName: listing.seller?.businessName || 'Vendedor',
        maxStock: listing.stock,
      })
    );
    setAdded(true);
    dispatch(setMarketplaceCartOpen(true));
    setTimeout(() => setAdded(false), 2000);
  };

  if (isLoading) return <div className="py-20 text-center text-slate-400">Cargando...</div>;
  if (error || !listing) return <div className="py-20 text-center text-slate-400">Producto no encontrado</div>;

  const images = listing.images?.length ? listing.images : [{ url: '/origenred-logo.svg' }];
  const hasDiscount = listing.compareAtPrice && listing.compareAtPrice > listing.price;

  return (
    <div className="animate-fade-in">
      <SEO title={listing.title} description={listing.shortDescription || listing.description?.slice(0, 160)} />

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="aspect-square bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <img src={images[0].url} alt={listing.title} className="w-full h-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.slice(1, 5).map((img, i) => (
                <img key={i} src={img.url} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-100 flex-shrink-0" />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {listing.seller && (
            <Link to={`/tienda/${listing.seller.slug}`} className="text-sm text-or-blue hover:underline">
              {listing.seller.businessName} · ⭐ {listing.seller.reputationScore}
            </Link>
          )}

          <h1 className="text-2xl sm:text-3xl font-bold text-or-navy">{listing.title}</h1>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-or-navy">{formatPrice(listing.price)}</span>
            {hasDiscount && (
              <span className="text-lg text-slate-400 line-through">{formatPrice(listing.compareAtPrice!)}</span>
            )}
          </div>

          {listing.freeShipping && (
            <span className="inline-block bg-green-50 text-or-green text-xs font-semibold px-3 py-1 rounded-full">
              Envío gratis
            </span>
          )}

          <p className="text-slate-600 leading-relaxed">{listing.description}</p>

          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {listing.brand && <span className="bg-slate-100 px-2 py-1 rounded-lg">Marca: {listing.brand}</span>}
            {listing.color && <span className="bg-slate-100 px-2 py-1 rounded-lg">Color: {listing.color}</span>}
            {listing.size && <span className="bg-slate-100 px-2 py-1 rounded-lg">Talle: {listing.size}</span>}
            <span className="bg-slate-100 px-2 py-1 rounded-lg">
              Stock: {listing.stock > 0 ? listing.stock : 'Agotado'}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleAddToCart}
              disabled={listing.stock <= 0}
              className="flex-1 py-3.5 bg-or-red hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-sm"
            >
              {listing.stock <= 0 ? 'Sin stock' : added ? '✓ Agregado' : 'Comprar ahora'}
            </button>
            {user && (
              <button
                onClick={() => toggleFavorite(listing._id)}
                className="px-4 py-3.5 border border-slate-200 rounded-xl text-slate-500 hover:border-or-red hover:text-or-red transition-colors"
                aria-label="Favorito"
              >
                ♥
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400">
            OrigenRank™ {listing.origenRankScore} · {listing.salesCount} ventas
          </p>
          {user && (
            <button
              onClick={() => setShowReport(true)}
              className="text-xs text-slate-400 hover:text-or-red underline"
            >
              Denunciar este producto
            </button>
          )}
        </div>
      </div>

      {showReport && (
        <ReportListingModal
          listingId={listing._id}
          listingTitle={listing.title}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};
