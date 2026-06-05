import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import { Layout } from './components/Layout';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminCatalog } from './pages/admin/AdminCatalog';
import { AdminProfitReport } from './pages/admin/AdminProfitReport';
import { Inventory } from './pages/Inventory';
import { POS } from './pages/POS';
import { SalesHistory } from './pages/SalesHistory';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { useGetSalesQuery } from './services/salesApi';
import { useGetProductsQuery } from './services/inventoryApi';

const STAT_CONFIGS = [
  {
    key: 'revenue',
    label: 'Facturación hoy',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'ring-emerald-500/20',
    iconPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'stock',
    label: 'Total en stock',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'ring-sky-500/20',
    iconPath: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
  {
    key: 'alerts',
    label: 'Alertas de stock',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'ring-amber-500/20',
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
  {
    key: 'invoices',
    label: 'Comprobantes hoy',
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
    border: 'ring-brand-500/20',
    iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
];

const Dashboard = () => {
  const { data: sales = [] } = useGetSalesQuery();
  const { data: products = [] } = useGetProductsQuery();

  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales
    .filter((s: any) => s.createdAt?.split('T')[0] === today)
    .reduce((acc: number, s: any) => acc + s.total, 0);
  const lowStockItems = products.filter((p: any) => p.stock <= p.minStock).length;
  const totalStock = products.reduce((acc: number, p: any) => acc + p.stock, 0);
  const todayInvoices = sales.filter((s: any) => s.createdAt?.split('T')[0] === today && s.cae).length;

  const statValues: Record<string, React.ReactNode> = {
    revenue: `$${todaySales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    stock: totalStock.toLocaleString(),
    alerts: lowStockItems,
    invoices: todayInvoices,
  };

  const recentSales = [...sales]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const now = new Date();
  const timeGreeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 mb-0.5">{timeGreeting}</p>
          <h1 className="page-title">Dashboard</h1>
        </div>
        <Link to="/pos" className="btn-primary w-full sm:w-auto justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva venta
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CONFIGS.map(s => (
          <div key={s.key} className="stat-card">
            <div className={`w-9 h-9 rounded-xl ${s.bg} ${s.color} ring-1 ${s.border} flex items-center justify-center flex-shrink-0`}>
              <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={s.iconPath} />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-white leading-none">{statValues[s.key]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row: Recent sales + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent sales */}
        <div className="lg:col-span-2 card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Ventas recientes</h2>
            <Link to="/sales" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">Ver todo →</Link>
          </div>
          {recentSales.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-600 text-sm">Sin ventas registradas aún</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[680px]">
                <thead>
                  <tr>
                    <th>Comprobante</th>
                    <th>Fecha</th>
                    <th>Método</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((s: any) => (
                    <tr key={s._id}>
                      <td className="font-medium text-white text-sm">{s.invoiceNumber || '—'}</td>
                      <td className="text-slate-500 text-xs">{new Date(s.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td><span className="badge-gray">{s.paymentMethod}</span></td>
                      <td className="text-right font-semibold text-white text-sm">${s.total?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card p-5 space-y-2">
          <h2 className="text-sm font-semibold text-white mb-3">Acciones rápidas</h2>
          {[
            { label: 'Punto de Venta', sub: 'Registrar venta', to: '/pos', iconPath: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z', accent: 'text-brand-400 bg-brand-500/10 ring-brand-500/20' },
            { label: 'Inventario', sub: 'Gestionar stock', to: '/inventory', iconPath: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', accent: 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20' },
            { label: 'Ventas', sub: 'Historial fiscal', to: '/sales', iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', accent: 'text-sky-400 bg-sky-500/10 ring-sky-500/20' },
            { label: 'Usuarios', sub: 'Gestión de accesos', to: '/admin/users', iconPath: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', accent: 'text-slate-400 bg-slate-500/10 ring-slate-500/20' },
            { label: 'Cat. y Sucursales', sub: 'Catálogo comercial', to: '/admin/catalog', iconPath: 'M4 6h16M4 12h16M4 18h16', accent: 'text-violet-400 bg-violet-500/10 ring-violet-500/20' },
            { label: 'Informe Ganancias', sub: 'Costos e IVA', to: '/admin/profit-report', iconPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', accent: 'text-amber-400 bg-amber-500/10 ring-amber-500/20' },
          ].map(a => (
            <Link key={a.to} to={a.to} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ring-1 flex-shrink-0 ${a.accent}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={a.iconPath} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white leading-none mb-0.5">{a.label}</p>
                <p className="text-xs text-slate-500">{a.sub}</p>
              </div>
              <svg className="w-4 h-4 text-slate-700 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.roles.includes('admin')) return <Navigate to="/" replace />;
  
  return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  return user ? <Navigate to="/" replace /> : <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>
  },
  {
    path: "/pos",
    element: <ProtectedRoute><POS /></ProtectedRoute>
  },
  {
    path: "/inventory",
    element: <ProtectedRoute><Inventory /></ProtectedRoute>
  },
  {
    path: "/sales",
    element: <ProtectedRoute><SalesHistory /></ProtectedRoute>
  },
  {
    path: "/admin/users",
    element: <ProtectedRoute adminOnly={true}><AdminUsers /></ProtectedRoute>
  },
  {
    path: "/admin/catalog",
    element: <ProtectedRoute adminOnly={true}><AdminCatalog /></ProtectedRoute>
  },
  {
    path: "/admin/profit-report",
    element: <ProtectedRoute adminOnly={true}><AdminProfitReport /></ProtectedRoute>
  },
  {
    path: "/login",
    element: <PublicRoute><Login /></PublicRoute>
  },
  {
    path: "/register",
    element: <PublicRoute><Register /></PublicRoute>
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  }
} as any);

export default function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
