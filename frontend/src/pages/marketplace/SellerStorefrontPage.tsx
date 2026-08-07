import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import { MarketplaceListingCard } from '../../components/marketplace/MarketplaceListingCard';
import { MarketplaceReportModal } from '../../components/marketplace/MarketplaceReportModal';
import { useGetSellerBySlugQuery, useGetListingsQuery } from '../../services/marketplaceApi';

export const SellerStorefrontPage: React.FC = () => {
  const { slug = '' } = useParams();
  const [showReport, setShowReport] = useState(false);
  const { data: seller, isLoading, error } = useGetSellerBySlugQuery(slug, { skip: !slug });
  const { data: listingsData, isLoading: listingsLoading } = useGetListingsQuery(
    seller?._id ? { seller: seller._id, limit: 24 } : undefined,
    { skip: !seller?._id }
  );

  if (isLoading) {
    return <p className="text-center py-16 text-slate-400">Cargando tienda...</p>;
  }

  if (error || !seller) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-slate-500">Vendedor no encontrado</p>
        <Link to="/buscar" className="text-or-red font-medium hover:underline">Explorar productos</Link>
      </div>
    );
  }

  const listings = listingsData?.items || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <SEO
        title={`${seller.businessName} — OrigenRed`}
        description={`Productos de ${seller.businessName} en OrigenRed`}
      />

      <section className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-or-navy">{seller.businessName}</h1>
        {seller.description && (
          <p className="text-slate-600 mt-2 max-w-2xl">{seller.description}</p>
        )}
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500">
          {seller.city && seller.province && (
            <span>{seller.city}, {seller.province}</span>
          )}
          <span>Reputación {seller.reputationScore}/100</span>
          <span>{seller.totalSales} ventas</span>
          <span>{seller.listingCount} publicaciones</span>
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="text-slate-400 hover:text-or-red"
          >
            Denunciar vendedor
          </button>
        </div>
      </section>

      {showReport && (
        <MarketplaceReportModal
          title="Denunciar vendedor"
          subtitle={seller.businessName}
          sellerId={seller._id}
          onClose={() => setShowReport(false)}
        />
      )}

      <section>
        <h2 className="text-xl font-bold text-or-navy mb-4">Productos</h2>
        {listingsLoading ? (
          <p className="text-slate-400">Cargando productos...</p>
        ) : listings.length === 0 ? (
          <p className="text-slate-400">Este vendedor no tiene productos activos</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <MarketplaceListingCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
