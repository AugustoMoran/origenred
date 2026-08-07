import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { EcommerceLayout } from './components/ecommerce/EcommerceLayout';
import {
  DashboardProtectedRoute,
  LoginRedirectRoute,
  MaintenanceGuard,
} from './components/ecommerce/RouteGuards';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { POS } from './pages/POS';
import { SalesHistory } from './pages/SalesHistory';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { OrigenRedHome } from './pages/marketplace/OrigenRedHome';
import { MarketplaceSearchPage } from './pages/marketplace/MarketplaceSearchPage';
import { MarketplaceListingDetail } from './pages/marketplace/MarketplaceListingDetail';
import { BuyerRegisterPage } from './pages/marketplace/BuyerRegisterPage';
import { SellerStorefrontPage } from './pages/marketplace/SellerStorefrontPage';
import { MarketplaceOrderDetailPage } from './pages/marketplace/MarketplaceOrderDetailPage';
import { MyChatsPage } from './pages/marketplace/MyChatsPage';
import { NotificationsPage } from './pages/marketplace/NotificationsPage';
import { MyReturnsPage } from './pages/marketplace/MyReturnsPage';
import { MyOrdersPage } from './pages/marketplace/MyOrdersPage';
import { SellerRegisterPage } from './pages/marketplace/SellerRegisterPage';
import { SellerLayout, SellerProtectedRoute } from './components/marketplace/SellerLayout';
import { SellerDashboard } from './pages/marketplace/seller/SellerDashboard';
import { SellerListingsPage } from './pages/marketplace/seller/SellerListingsPage';
import { SellerListingFormPage } from './pages/marketplace/seller/SellerListingFormPage';
import { MarketplaceCheckoutPage } from './pages/marketplace/MarketplaceCheckoutPage';
import { MarketplaceOrderConfirmation } from './pages/marketplace/MarketplaceOrderConfirmation';
import { MyFavoritesPage } from './pages/marketplace/MyFavoritesPage';
import { OrderChatPage } from './pages/marketplace/OrderChatPage';
import { SellerOrdersPage } from './pages/marketplace/seller/SellerOrdersPage';
import { SellerReturnsPage } from './pages/marketplace/seller/SellerReturnsPage';
import { SellerServicesPage } from './pages/marketplace/seller/SellerServicesPage';
import { SellerLearningPage } from './pages/marketplace/seller/SellerLearningPage';
import { SellerProfilePage } from './pages/marketplace/seller/SellerProfilePage';
import { SellerMercadoPagoPage } from './pages/marketplace/seller/SellerMercadoPagoPage';
import { SellerMercadoPagoCallbackPage } from './pages/marketplace/seller/SellerMercadoPagoCallbackPage';
import { MarketplacePaymentReturnPage } from './pages/marketplace/MarketplacePaymentReturnPage';
import { StoreAuthRoute } from './components/ecommerce/RouteGuards';
import { StoreProducts } from './pages/store/StoreProducts';
import { StoreProductDetail } from './pages/store/StoreProductDetail';
import { StoreCheckout } from './pages/store/StoreCheckout';
import { StoreCheckoutConfirmation } from './pages/store/StoreCheckoutConfirmation';
import { StoreWhatsAppSent } from './pages/store/StoreWhatsAppSent';
import { StoreRegister } from './pages/store/StoreRegister';
import { Maintenance } from './pages/store/Maintenance';
import { NotFoundPage } from './pages/NotFoundPage';

const AdminUsers = React.lazy(() => import('./pages/admin').then((m) => ({ default: m.AdminUsers })));
const AdminCatalog = React.lazy(() => import('./pages/admin').then((m) => ({ default: m.AdminCatalog })));
const AdminProfitReport = React.lazy(() => import('./pages/admin').then((m) => ({ default: m.AdminProfitReport })));
const AdminSupplierLedger = React.lazy(() => import('./pages/admin').then((m) => ({ default: m.AdminSupplierLedger })));
const AdminStoreSettings = React.lazy(() => import('./pages/admin').then((m) => ({ default: m.AdminStoreSettings })));
const AdminMarketplaceSellers = React.lazy(() =>
  import('./pages/admin').then((m) => ({ default: m.AdminMarketplaceSellers }))
);
const AdminMarketplaceReports = React.lazy(() =>
  import('./pages/admin').then((m) => ({ default: m.AdminMarketplaceReports }))
);
const AdminMarketplaceCategories = React.lazy(() =>
  import('./pages/admin').then((m) => ({ default: m.AdminMarketplaceCategories }))
);
const AdminMarketplaceAnalytics = React.lazy(() =>
  import('./pages/admin').then((m) => ({ default: m.AdminMarketplaceAnalytics }))
);
const AdminMarketplaceReturns = React.lazy(() =>
  import('./pages/admin').then((m) => ({ default: m.AdminMarketplaceReturns }))
);
const AdminMarketplaceServiceLeads = React.lazy(() =>
  import('./pages/admin').then((m) => ({ default: m.AdminMarketplaceServiceLeads }))
);

const LazyAdmin = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="p-8 text-slate-500 text-sm">Cargando...</div>}>{children}</Suspense>
);

const DashboardLayout = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => (
  <DashboardProtectedRoute adminOnly={adminOnly}>
    <Layout>{children}</Layout>
  </DashboardProtectedRoute>
);

const router = createBrowserRouter([
  {
    element: (
      <MaintenanceGuard>
        <EcommerceLayout />
      </MaintenanceGuard>
    ),
    children: [
      { path: '/', element: <OrigenRedHome /> },
      { path: '/buscar', element: <MarketplaceSearchPage /> },
      { path: '/p/:slug', element: <MarketplaceListingDetail /> },
      { path: '/tienda/:slug', element: <SellerStorefrontPage /> },
      { path: '/registro', element: <BuyerRegisterPage /> },
      { path: '/vender', element: <SellerRegisterPage /> },
      { path: '/comprar', element: <MarketplaceCheckoutPage /> },
      { path: '/compras/confirmacion/:orderNumber', element: <MarketplaceOrderConfirmation /> },
      { path: '/compras/exito', element: <MarketplacePaymentReturnPage kind="success" /> },
      { path: '/compras/error', element: <MarketplacePaymentReturnPage kind="failure" /> },
      { path: '/compras/pendiente', element: <MarketplacePaymentReturnPage kind="pending" /> },
      { path: '/cuenta/compras', element: <StoreAuthRoute><MyOrdersPage /></StoreAuthRoute> },
      { path: '/cuenta/compras/:orderNumber', element: <StoreAuthRoute><MarketplaceOrderDetailPage /></StoreAuthRoute> },
      { path: '/cuenta/favoritos', element: <StoreAuthRoute><MyFavoritesPage /></StoreAuthRoute> },
      { path: '/cuenta/mensajes', element: <StoreAuthRoute><MyChatsPage /></StoreAuthRoute> },
      { path: '/cuenta/notificaciones', element: <StoreAuthRoute><NotificationsPage /></StoreAuthRoute> },
      { path: '/cuenta/devoluciones', element: <StoreAuthRoute><MyReturnsPage /></StoreAuthRoute> },
      { path: '/cuenta/chat/:orderNumber', element: <StoreAuthRoute><OrderChatPage /></StoreAuthRoute> },
      { path: '/products', element: <StoreProducts /> },
      { path: '/products/:id', element: <StoreProductDetail /> },
      { path: '/checkout', element: <StoreCheckout /> },
      { path: '/checkout/consulta-enviada', element: <StoreWhatsAppSent /> },
      { path: '/checkout/confirmation/:orderId', element: <StoreCheckoutConfirmation /> },
      { path: '/store/register', element: <StoreRegister /> },
    ],
  },
  { path: '/maintenance', element: <Maintenance /> },
  {
    path: '/dashboard',
    element: <DashboardLayout><Dashboard /></DashboardLayout>,
  },
  {
    path: '/dashboard/pos',
    element: <DashboardLayout><POS /></DashboardLayout>,
  },
  {
    path: '/dashboard/inventory',
    element: <DashboardLayout><Inventory /></DashboardLayout>,
  },
  {
    path: '/dashboard/sales',
    element: <DashboardLayout><SalesHistory /></DashboardLayout>,
  },
  {
    path: '/dashboard/admin/users',
    element: <DashboardLayout adminOnly><LazyAdmin><AdminUsers /></LazyAdmin></DashboardLayout>,
  },
  {
    path: '/dashboard/admin/catalog',
    element: <DashboardLayout adminOnly><LazyAdmin><AdminCatalog /></LazyAdmin></DashboardLayout>,
  },
  {
    path: '/dashboard/admin/store-settings',
    element: <DashboardLayout adminOnly><LazyAdmin><AdminStoreSettings /></LazyAdmin></DashboardLayout>,
  },
  {
    path: '/dashboard/admin/profit-report',
    element: <DashboardLayout adminOnly><LazyAdmin><AdminProfitReport /></LazyAdmin></DashboardLayout>,
  },
  {
    path: '/vendedor',
    element: (
      <SellerProtectedRoute>
        <SellerLayout />
      </SellerProtectedRoute>
    ),
    children: [
      { index: true, element: <SellerDashboard /> },
      { path: 'productos', element: <SellerListingsPage /> },
      { path: 'productos/nuevo', element: <SellerListingFormPage /> },
      { path: 'productos/:id/editar', element: <SellerListingFormPage /> },
      { path: 'ventas', element: <SellerOrdersPage /> },
      { path: 'devoluciones', element: <SellerReturnsPage /> },
      { path: 'servicios', element: <SellerServicesPage /> },
      { path: 'aprendizaje', element: <SellerLearningPage /> },
      { path: 'perfil', element: <SellerProfilePage /> },
      { path: 'mercadopago', element: <SellerMercadoPagoPage /> },
      { path: 'mercadopago/callback', element: <SellerMercadoPagoCallbackPage /> },
    ],
  },
  {
    path: '/dashboard/admin/marketplace-reports',
    element: <DashboardLayout adminOnly><LazyAdmin><AdminMarketplaceReports /></LazyAdmin></DashboardLayout>,
  },
  {
    path: '/dashboard/admin/marketplace-sellers',
    element: <DashboardLayout adminOnly><LazyAdmin><AdminMarketplaceSellers /></LazyAdmin></DashboardLayout>,
  },
  {
    path: '/dashboard/admin/marketplace-categories',
    element: <DashboardLayout adminOnly><LazyAdmin><AdminMarketplaceCategories /></LazyAdmin></DashboardLayout>,
  },
  {
    path: '/dashboard/admin/marketplace-analytics',
    element: <DashboardLayout adminOnly><LazyAdmin><AdminMarketplaceAnalytics /></LazyAdmin></DashboardLayout>,
  },
  {
    path: '/dashboard/admin/marketplace-returns',
    element: <DashboardLayout adminOnly><LazyAdmin><AdminMarketplaceReturns /></LazyAdmin></DashboardLayout>,
  },
  {
    path: '/dashboard/admin/marketplace-services',
    element: <DashboardLayout adminOnly><LazyAdmin><AdminMarketplaceServiceLeads /></LazyAdmin></DashboardLayout>,
  },
  {
    path: '/dashboard/admin/supplier-ledger',
    element: <DashboardLayout adminOnly><LazyAdmin><AdminSupplierLedger /></LazyAdmin></DashboardLayout>,
  },
  // Legacy redirects
  { path: '/pos', element: <Navigate to="/dashboard/pos" replace /> },
  { path: '/inventory', element: <Navigate to="/dashboard/inventory" replace /> },
  { path: '/sales', element: <Navigate to="/dashboard/sales" replace /> },
  { path: '/admin/users', element: <Navigate to="/dashboard/admin/users" replace /> },
  { path: '/admin/catalog', element: <Navigate to="/dashboard/admin/catalog" replace /> },
  { path: '/admin/store-settings', element: <Navigate to="/dashboard/admin/store-settings" replace /> },
  { path: '/admin/profit-report', element: <Navigate to="/dashboard/admin/profit-report" replace /> },
  { path: '/admin/supplier-ledger', element: <Navigate to="/dashboard/admin/supplier-ledger" replace /> },
  {
    path: '/login',
    element: (
      <LoginRedirectRoute>
        <Login />
      </LoginRedirectRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <LoginRedirectRoute>
        <Register />
      </LoginRedirectRoute>
    ),
  },
  { path: '*', element: <NotFoundPage /> },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
} as any);

export default function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
