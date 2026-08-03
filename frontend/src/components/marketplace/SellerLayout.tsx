import React from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/authSlice';
import { useLogoutMutation } from '../../services/authApi';
import { useGetMySellerProfileQuery } from '../../services/marketplaceApi';

const NAV = [
  { to: '/vendedor', label: 'Resumen', exact: true },
  { to: '/vendedor/productos', label: 'Mis productos' },
  { to: '/vendedor/productos/nuevo', label: 'Nueva publicación' },
  { to: '/vendedor/ventas', label: 'Mis ventas' },
  { to: '/vendedor/mercadopago', label: 'Mercado Pago' },
];

export const SellerProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  if (!user) return <Navigate to="/login" replace />;
  if (!user.roles?.includes('vendedor_marketplace') && !user.roles?.includes('admin')) {
    return <Navigate to="/vender" replace />;
  }
  return <>{children}</>;
};

export const SellerLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [logoutReq] = useLogoutMutation();
  const { data: profile, isLoading } = useGetMySellerProfileQuery(undefined, {
    skip: !user?.roles?.includes('vendedor_marketplace'),
  });

  const handleLogout = async () => {
    try { await logoutReq().unwrap(); } catch { /* ignore */ }
    dispatch(logout());
    navigate('/login');
  };

  const statusBadge = (status?: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-green-100 text-green-700',
      suspended: 'bg-red-100 text-red-700',
      rejected: 'bg-red-100 text-red-600',
    };
    const labels: Record<string, string> = {
      pending: 'Pendiente de aprobación',
      approved: 'Aprobado',
      suspended: 'Suspendido',
      rejected: 'Rechazado',
    };
    return (
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[status || ''] || 'bg-slate-100 text-slate-600'}`}>
        {labels[status || ''] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden md:flex w-60 flex-col bg-or-navy text-white fixed inset-y-0 left-0">
        <div className="p-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2">
            <img src="/origenred-logo.png" alt="" className="h-8 w-8" />
            <span className="font-bold">Panel Vendedor</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to) && item.to !== '/vendedor';
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-2">
          <Link to="/" className="block text-xs text-blue-300 hover:text-white">← Volver al marketplace</Link>
          <button onClick={handleLogout} className="text-xs text-blue-300 hover:text-white">Cerrar sesión</button>
        </div>
      </aside>

      <div className="flex-1 md:ml-60">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-or-navy">{profile?.businessName || 'Mi tienda'}</h1>
            {!isLoading && profile && statusBadge(profile.status)}
          </div>
          <span className="text-sm text-slate-500">{user?.email}</span>
        </header>

        {profile?.status === 'pending' && (
          <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
            Tu cuenta está en revisión. Podrás publicar productos cuando un administrador te apruebe.
          </div>
        )}

        {profile?.status === 'rejected' && profile.rejectionReason && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            Solicitud rechazada: {profile.rejectionReason}
          </div>
        )}

        <main className="p-6">
          <Outlet context={{ profile }} />
        </main>
      </div>
    </div>
  );
};
