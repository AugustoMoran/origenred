import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { SEO } from '../../components/ecommerce/SEO';
import { useGetStoreProductQuery } from '../../services/ecommerceApi';
import { addToCart, setCartOpen } from '../../store/cartSlice';
import { useTrackEventMutation } from '../../services/analyticsApi';

export const StoreProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState('');
  const { data: product, isLoading, isError } = useGetStoreProductQuery(id || '', { skip: !id });
  const [trackEvent] = useTrackEventMutation();

  const galleryImages = useMemo(() => {
    if (!product) return [] as string[];
    const fromGallery = (product.gallery || []).map((item) => item.url).filter(Boolean);
    const images = product.imageUrl ? [product.imageUrl, ...fromGallery.filter((url) => url !== product.imageUrl)] : fromGallery;
    return images;
  }, [product]);

  useEffect(() => {
    if (product) {
      trackEvent({ event: 'product_view', path: `/products/${id}`, productId: product._id }).catch(() => {});
    }
  }, [product, id, trackEvent]);

  useEffect(() => {
    if (galleryImages.length) {
      setActiveImage(galleryImages[0]);
    } else {
      setActiveImage('');
    }
  }, [galleryImages]);

  const outOfStock = !product || product.stock <= 0;

  const handleAddToCart = () => {
    if (!product || outOfStock) return;
    dispatch(
      addToCart({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity,
        imageUrl: product.imageUrl || galleryImages[0],
        slug: product.slug,
        maxStock: product.stock,
      })
    );
    dispatch(setCartOpen(true));
  };

  if (isLoading) {
    return <div className="text-slate-500 text-sm py-20 text-center">Cargando producto...</div>;
  }

  if (isError || !product) {
    return (
      <div className="card p-12 text-center space-y-4">
        <p className="text-slate-400">Producto no encontrado</p>
        <Link to="/products" className="btn-secondary inline-flex">Volver al catálogo</Link>
      </div>
    );
  }

  const shortDescription = product.commercialDescription || product.description;
  const seoTitle = product.seoTitle || product.name;
  const seoDescription = product.seoDescription || product.commercialDescription || product.description || product.name;

  return (
    <div className="animate-slide-up">
      <SEO title={seoTitle} description={seoDescription} />

      <Link to="/products" className="text-sm text-brand-400 hover:text-brand-300 mb-6 inline-flex items-center gap-1">
        ← Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-slate-800 card p-0">
            {activeImage ? (
              <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {galleryImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {galleryImages.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(url)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border flex-shrink-0 transition-colors ${
                    activeImage === url ? 'border-brand-400 ring-1 ring-brand-400/40' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="badge-gray">{product.category}</span>
              {product.featured && <span className="badge-blue">Destacado</span>}
              {outOfStock && <span className="badge-red">Sin stock</span>}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{product.name}</h1>
            <p className="text-xs text-slate-500 font-mono mt-2">SKU: {product.sku}</p>
          </div>

          <p className="text-3xl font-bold text-brand-400 tabular-nums">
            ${product.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>

          {shortDescription && (
            <p className="text-slate-300 leading-relaxed">{shortDescription}</p>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="btn-icon-sm"
                disabled={quantity <= 1}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="w-10 text-center font-bold text-white tabular-nums">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                className="btn-icon-sm"
                disabled={quantity >= product.stock}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <span className="text-xs text-slate-500">{product.stock} disponibles</span>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className="btn-primary w-full sm:w-auto py-3 px-8 disabled:opacity-40"
          >
            {outOfStock ? 'Sin stock' : 'Agregar al carrito'}
          </button>
        </div>
      </div>

      {product.longDescription && (
        <div className="card p-6 mt-10 space-y-3">
          <h2 className="text-lg font-semibold text-white">Descripción del producto</h2>
          <div className="text-slate-400 leading-relaxed whitespace-pre-line">{product.longDescription}</div>
        </div>
      )}

      {(product.weight || product.dimensions) && (
        <div className="card p-6 mt-4">
          <h2 className="text-sm font-semibold text-white mb-3">Información de envío</h2>
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            {product.weight ? <span>Peso: {product.weight} kg</span> : null}
            {product.dimensions?.length ? <span>Largo: {product.dimensions.length} cm</span> : null}
            {product.dimensions?.width ? <span>Ancho: {product.dimensions.width} cm</span> : null}
            {product.dimensions?.height ? <span>Alto: {product.dimensions.height} cm</span> : null}
          </div>
        </div>
      )}
    </div>
  );
};
