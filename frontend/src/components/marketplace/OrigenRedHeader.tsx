import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { selectMarketplaceCartCount, toggleMarketplaceCart } from '../../store/marketplaceCartSlice';
import { isStaffRole } from '../ecommerce/RouteGuards';

const logo = '/origenred-logo.png';

export const OrigenRedHeader: React.FC = () => {
  const dispatch = useDispatch();
  const cartCount = useSelector(selectMarketplaceCartCount);
  const { user } = useSelector((state: RootState) => state.auth);

  const isSeller = user?.roles?.includes('vendedor_marketplace');
  const isAdmin = user?.roles?.includes('admin');

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
            <img src={logo} alt="OrigenRed" className="h-9 w-9 object-contain" />
            <span className="text-lg font-bold tracking-tight">
              <span className="text-or-navy">Origen</span>
              <span className="text-or-red">Red</span>
            </span>
          </Link>

          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <form action="/buscar" method="get" className="w-full relative">
              <input
                name="q"
                type="search"
                placeholder="Buscar productos, marcas, categorías..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm text-or-navy placeholder-slate-400 focus:outline-none focus:border-or-blue focus:ring-2 focus:ring-or-blue/10 transition-all"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-or-blue">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            <Link to="/" className="px-3 py-2 text-sm text-slate-600 hover:text-or-navy rounded-lg hover:bg-slate-50 transition-colors">
              Inicio
            </Link>
            <Link to="/buscar" className="px-3 py-2 text-sm text-slate-600 hover:text-or-navy rounded-lg hover:bg-slate-50 transition-colors">
              Explorar
            </Link>
            <Link to="/vender" className="px-3 py-2 text-sm text-or-red font-medium rounded-lg hover:bg-red-50 transition-colors">
              Vender
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/dashboard" className="hidden sm:inline-flex items-center px-3 py-2 text-xs font-medium text-or-navy bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                Admin
              </Link>
            )}
            {isSeller && (
              <Link to="/vendedor" className="hidden sm:inline-flex items-center px-3 py-2 text-xs font-medium text-or-blue bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                Mi tienda
              </Link>
            )}
            {!user ? (
              <>
                <Link to="/login" className="px-3 py-2 text-xs font-medium text-or-navy hover:text-or-blue transition-colors">
                  Ingresar
                </Link>
                <Link to="/register" className="px-4 py-2 text-xs font-semibold text-white bg-or-red hover:bg-red-600 rounded-xl transition-colors shadow-sm">
                  Registrarse
                </Link>
              </>
            ) : (
              <Link to="/cuenta" className="px-3 py-2 text-xs text-slate-500 truncate max-w-[100px] hidden sm:block">
                {user.name || user.email}
              </Link>
            )}

            <button
              onClick={() => dispatch(toggleMarketplaceCart())}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-or-navy hover:border-or-blue/30 transition-colors"
              aria-label="Carrito"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-or-red text-white text-[9px] font-bold flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
