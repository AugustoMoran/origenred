import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { EcommerceLayout } from './components/ecommerce/EcommerceLayout';
import {
  DashboardProtectedRoute,
  LoginRedirectRoute,
  MaintenanceGuard,
} from './components/ecommerce/RouteGuards';
import { AdminUsers, AdminCatalog, AdminProfitReport, AdminSupplierLedger, AdminStoreSettings } from './pages/admin';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { POS } from './pages/POS';
import { SalesHistory } from './pages/SalesHistory';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { StoreHome } from './pages/store/StoreHome';
import { StoreProducts } from './pages/store/StoreProducts';
import { StoreProductDetail } from './pages/store/StoreProductDetail';
import { StoreCheckout } from './pages/store/StoreCheckout';
import { StoreCheckoutConfirmation } from './pages/store/StoreCheckoutConfirmation';
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
      { path: '/', element: <StoreHome /> },
      { path: '/products', element: <StoreProducts /> },
      { path: '/products/:id', element: <StoreProductDetail /> },
      { path: '/checkout', element: <StoreCheckout /> },
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
