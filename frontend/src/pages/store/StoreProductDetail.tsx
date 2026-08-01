import React, { useEffect, useState } from 'react';
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
  const { data: product, isLoading, isError } = useGetStoreProductQuery(id || '', { skip: !id });
  const [trackEvent] = useTrackEventMutation();

  useEffect(() => {
    if (product) {
      trackEvent({ event: 'product_view', path: `/products/${id}`, productId: product._id }).catch(() => {});
    }
  }, [product, id, trackEvent]);

  const outOfStock = !product || product.stock <= 0;

  const handleAddToCart = () => {
    if (!product || outOfStock) return;
    dispatch(
      addToCart({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity,
        imageUrl: product.imageUrl,
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

  return (
    <div className="animate-slide-up">
      <SEO title={product.name} description={product.description || product.name} />

      <Link to="/products" className="text-sm text-brand-400 hover:text-brand-300 mb-6 inline-flex items-center gap-1">
        ← Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="aspect-square rounded-2xl overflow-hidden bg-slate-800 card p-0">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
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

          {product.description && (
            <p className="text-slate-400 leading-relaxed">{product.description}</p>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="btn-icon-sm"
                disabled={quantity <= 1}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="w-10 text-center font-bold text-white tabular-nums">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                className="btn-icon-sm"
                disabled={quantity >= product.stock}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
    </div>
  );
};
