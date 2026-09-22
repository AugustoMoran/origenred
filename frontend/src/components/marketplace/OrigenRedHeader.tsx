import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { selectMarketplaceCartCount, toggleMarketplaceCart } from '../../store/marketplaceCartSlice';
import { useGetNotificationSummaryQuery } from '../../services/marketplaceApi';
import { OrigenRedLogo } from '../branding/OrigenRedLogo';
import { MarketplaceAccountMenu } from './MarketplaceAccountMenu';
import { MarketplaceSearchBar } from './MarketplaceSearchBar';

export const OrigenRedHeader: React.FC = () => {
  const dispatch = useDispatch();
  const cartCount = useSelector(selectMarketplaceCartCount);
  const { user } = useSelector((state: RootState) => state.auth);
  const { data: notifications } = useGetNotificationSummaryQuery(undefined, { skip: !user });

  const isSeller = user?.roles?.includes('vendedor_marketplace');
  const isAdmin = user?.roles?.includes('admin');
  const showSellerPanel = isSeller || isAdmin;
  const unread = notifications?.totalUnread ?? notifications?.unreadChatMessages ?? 0;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="min-h-[3.5rem] sm:min-h-[4rem] py-2 flex items-center justify-between gap-2 sm:gap-3">
          <Link to="/" className="flex items-center min-w-0 flex-shrink-0 group">
            <OrigenRedLogo variant="header" className="group-hover:opacity-90 transition-opacity" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1 flex-shrink-0">
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

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {isAdmin && (
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-white bg-or-red hover:bg-red-600 rounded-lg transition-colors"
              >
                Admin
              </Link>
            )}
            {showSellerPanel && (
              <Link
                to="/vendedor"
                className="hidden sm:inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-or-blue bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Vendedor
              </Link>
            )}
            {!user ? (
              <>
                <Link to="/login" className="px-2 sm:px-3 py-2 text-xs font-medium text-or-navy hover:text-or-blue transition-colors">
                  Ingresar
                </Link>
                <Link to="/registro" className="px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-or-red hover:bg-red-600 rounded-xl transition-colors shadow-sm">
                  Registro
                </Link>
              </>
            ) : (
              <>
                <div className="hidden xl:flex items-center gap-1">
                  <Link to="/cuenta/favoritos" className="px-2 py-2 text-xs text-slate-500 hover:text-or-navy">
                    Favoritos
                  </Link>
                  <Link to="/cuenta/compras" className="px-2 py-2 text-xs text-slate-500 hover:text-or-navy">
                    Compras
                  </Link>
                </div>
                <MarketplaceAccountMenu />
              </>
            )}

            {user && (
              <>
                <Link
                  to="/cuenta/notificaciones"
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-or-navy hover:border-or-blue/30 transition-colors"
                  aria-label="Notificaciones"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-or-red text-white text-[9px] font-bold flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>
                <Link
                  to="/cuenta/mensajes"
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-or-navy hover:border-or-blue/30 transition-colors"
                  aria-label="Mensajes"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </Link>
              </>
            )}

            <button
              onClick={() => dispatch(toggleMarketplaceCart())}
              className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-or-navy hover:border-or-blue/30 transition-colors"
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

        <div className="pb-2.5 sm:pb-3 border-t border-slate-100/80 pt-2.5">
          <MarketplaceSearchBar />
        </div>
      </div>
    </header>
  );
};
