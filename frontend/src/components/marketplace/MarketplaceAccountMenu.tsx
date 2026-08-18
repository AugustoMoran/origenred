import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { logout as logoutAction } from '../../store/authSlice';
import { useLogoutMutation } from '../../services/authApi';
import { useGetMySellerProfileQuery } from '../../services/marketplaceApi';

export const MarketplaceAccountMenu: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logoutApi] = useLogoutMutation();

  const isAdmin = user?.roles?.includes('admin');
  const isSellerRole = user?.roles?.includes('vendedor_marketplace');
  const { data: sellerProfile } = useGetMySellerProfileQuery(undefined, {
    skip: !user || !isSellerRole,
  });
  const isSeller = isSellerRole || sellerProfile?.status === 'approved' || sellerProfile?.status === 'pending';

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {
      // cookie cleared on server or network fail — still clear local state
    }
    dispatch(logoutAction());
    navigate('/');
  };

  const displayName = user.name?.trim() || user.email?.split('@')[0] || 'Mi cuenta';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:border-or-blue/40 hover:bg-slate-50 transition-colors max-w-[200px]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="w-8 h-8 rounded-lg bg-or-navy text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:block text-xs font-medium text-or-navy truncate">{displayName}</span>
        <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-100 shadow-lg py-2 z-50 animate-fade-in"
          role="menu"
        >
          <div className="px-4 py-2 border-b border-slate-100">
            <p className="text-sm font-semibold text-or-navy truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>

          <Link
            to="/cuenta/perfil"
            className="block px-4 py-2.5 text-sm text-or-navy hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            Mi perfil
          </Link>

          {isAdmin && (
            <Link
              to="/dashboard"
              className="block px-4 py-2.5 text-sm font-semibold text-or-red hover:bg-red-50"
              onClick={() => setOpen(false)}
            >
              Panel administrador
            </Link>
          )}

          {isSeller && (
            <Link
              to="/vendedor"
              className="block px-4 py-2.5 text-sm text-or-blue hover:bg-blue-50"
              onClick={() => setOpen(false)}
            >
              Panel vendedor
            </Link>
          )}

          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 hover:text-or-navy"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
