import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { selectCartCount, toggleCart } from '../../store/cartSlice';
import { isStaffRole } from './RouteGuards';

const brandLogo = '/brand-logo.png';

export const StoreHeader: React.FC = () => {
  const dispatch = useDispatch();
  const cartCount = useSelector(selectCartCount);
  const { user } = useSelector((state: RootState) => state.auth);
  const companyName = (import.meta as any).env?.VITE_COMPANY_NAME || 'Tienda';

  return (
    <header className="sticky top-0 z-40 bg-[#060D1F]/95 backdrop-blur border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-white/90 flex items-center justify-center ring-1 ring-white/25 overflow-hidden flex-shrink-0">
            <img src={brandLogo} alt="Logo" className="w-7 h-7 object-contain" />
          </div>
          <span className="text-sm font-semibold text-white truncate">{companyName}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/" className="px-3 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors">
            Inicio
          </Link>
          <Link to="/products" className="px-3 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors">
            Productos
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user && isStaffRole(user.roles) && (
            <Link to="/dashboard" className="btn-secondary !py-2 !px-3 text-xs hidden sm:inline-flex">
              Panel
            </Link>
          )}

          {!user ? (
            <>
              <Link to="/login" className="btn-secondary !py-2 !px-3 text-xs">
                Ingresar
              </Link>
              <Link to="/store/register" className="btn-primary !py-2 !px-3 text-xs hidden sm:inline-flex">
                Registrarse
              </Link>
            </>
          ) : (
            <span className="text-xs text-slate-500 hidden sm:inline truncate max-w-[120px]">
              {user.email}
            </span>
          )}

          <button
            onClick={() => dispatch(toggleCart())}
            className="btn-icon relative"
            aria-label="Abrir carrito"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#060D1F]">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
