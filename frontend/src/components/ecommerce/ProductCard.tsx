import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { StoreProduct } from '../../services/ecommerceApi';
import { addToCart, setCartOpen } from '../../store/cartSlice';

interface ProductCardProps {
  product: StoreProduct;
  showFeatured?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, showFeatured = true }) => {
  const dispatch = useDispatch();
  const productPath = `/products/${product.slug || product._id}`;
  const outOfStock = product.stock <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;

    dispatch(
      addToCart({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrl,
        slug: product.slug,
        maxStock: product.stock,
      })
    );
    dispatch(setCartOpen(true));
  };

  return (
    <Link
      to={productPath}
      className="group card p-0 overflow-hidden hover:ring-1 hover:ring-brand-500/30 transition-all hover:shadow-glow-sm flex flex-col"
    >
      <div className="aspect-square bg-slate-800 relative overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/logooficialdefinitivo.png';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {showFeatured && product.featured && (
          <span className="absolute top-2 left-2 badge-blue text-[10px]">Destacado</span>
        )}

        {outOfStock && (
          <span className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="badge-red">Sin stock</span>
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{product.category}</p>
        <h3 className="text-sm font-semibold text-white line-clamp-2 min-h-[2.5rem] leading-snug group-hover:text-brand-300 transition-colors">
          {product.name}
        </h3>
        {(product.commercialDescription || product.description) && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            {product.commercialDescription || product.description}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          <span className="text-lg font-bold text-brand-400 tabular-nums">
            ${product.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className="btn-primary !py-1.5 !px-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Agregar
          </button>
        </div>
      </div>
    </Link>
  );
};
