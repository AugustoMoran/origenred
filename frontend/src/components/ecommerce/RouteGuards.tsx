import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { RootState } from '../../store';
import { useGetPublicSettingsQuery } from '../../services/settingsApi';

const isStaffRole = (roles: string[]) =>
  roles.some((r) => ['admin', 'vendedor'].includes(r.toLowerCase()));

const isCustomerRole = (roles: string[]) =>
  roles.some((r) => r.toLowerCase() === 'user') && !isStaffRole(roles);

export const DashboardProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isStaffRole(user.roles)) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !user.roles.includes('admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const StoreAuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useSelector((state: RootState) => state.auth);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const LoginRedirectRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useSelector((state: RootState) => state.auth);

  if (user) {
    if (isStaffRole(user.roles)) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const { data: settings } = useGetPublicSettingsQuery();

  const isDashboard = location.pathname.startsWith('/dashboard');
  const isMaintenancePage = location.pathname === '/maintenance';
  const isLogin = location.pathname === '/login';
  const isStaff = user && isStaffRole(user.roles);

  if (settings?.maintenanceMode && !isDashboard && !isMaintenancePage && !isLogin && !isStaff) {
    return <Navigate to="/maintenance" replace />;
  }

  if (!settings?.maintenanceMode && isMaintenancePage) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export { isStaffRole, isCustomerRole };
