import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { EcommerceLayout } from './components/ecommerce/EcommerceLayout';
import {
  DashboardProtectedRoute,
  LoginRedirectRoute,
  MaintenanceGuard,
} from './components/ecommerce/RouteGuards';
import { AdminUsers, AdminCatalog, AdminProfitReport, AdminSupplierLedger, AdminStoreSettings, AdminMarketplaceSellers, AdminMarketplaceReports } from './pages/admin';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { POS } from './pages/POS';
import { SalesHistory } from './pages/SalesHistory';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { OrigenRedHome } from './pages/marketplace/OrigenRedHome';
import { MarketplaceSearchPage } from './pages/marketplace/MarketplaceSearchPage';
import { MarketplaceListingDetail } from './pages/marketplace/MarketplaceListingDetail';
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
import { SellerMercadoPagoPage } from './pages/marketplace/seller/SellerMercadoPagoPage';
import { StoreAuthRoute } from './components/ecommerce/RouteGuards';
import { StoreProducts } from './pages/store/StoreProducts';
import { StoreProductDetail } from './pages/store/StoreProductDetail';
import { StoreCheckout } from './pages/store/StoreCheckout';
import { StoreCheckoutConfirmation } from './pages/store/StoreCheckoutConfirmation';
import { StoreWhatsAppSent } from './pages/store/StoreWhatsAppSent';
import { StoreRegister } from './pages/store/StoreRegister';
import { Maintenance } from './pages/store/Maintenance';

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
      { path: '/vender', element: <SellerRegisterPage /> },
      { path: '/comprar', element: <MarketplaceCheckoutPage /> },
      { path: '/compras/confirmacion/:orderNumber', element: <MarketplaceOrderConfirmation /> },
      { path: '/compras/exito', element: <MarketplaceOrderConfirmation /> },
      { path: '/compras/pendiente', element: <MarketplaceOrderConfirmation /> },
      { path: '/cuenta/compras', element: <StoreAuthRoute><MyOrdersPage /></StoreAuthRoute> },
      { path: '/cuenta/favoritos', element: <StoreAuthRoute><MyFavoritesPage /></StoreAuthRoute> },
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
    element: <DashboardLayout adminOnly><AdminUsers /></DashboardLayout>,
  },
  {
    path: '/dashboard/admin/catalog',
    element: <DashboardLayout adminOnly><AdminCatalog /></DashboardLayout>,
  },
  {
    path: '/dashboard/admin/store-settings',
    element: <DashboardLayout adminOnly><AdminStoreSettings /></DashboardLayout>,
  },
  {
    path: '/dashboard/admin/profit-report',
    element: <DashboardLayout adminOnly><AdminProfitReport /></DashboardLayout>,
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
      { path: 'mercadopago', element: <SellerMercadoPagoPage /> },
    ],
  },
  {
    path: '/dashboard/admin/marketplace-reports',
    element: <DashboardLayout adminOnly><AdminMarketplaceReports /></DashboardLayout>,
  },
  {
    path: '/dashboard/admin/marketplace-sellers',
    element: <DashboardLayout adminOnly><AdminMarketplaceSellers /></DashboardLayout>,
  },
  {
    path: '/dashboard/admin/supplier-ledger',
    element: <DashboardLayout adminOnly><AdminSupplierLedger /></DashboardLayout>,
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
