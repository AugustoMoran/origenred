import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface HasPermissionProps {
  permission?: string;
  role?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const HasPermission: React.FC<HasPermissionProps> = ({ 
  permission, 
  role, 
  children, 
  fallback = null 
}) => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated || !user) return <>{fallback}</>;

  // Admin has access to everything
  if (user.roles.includes('admin')) return <>{children}</>;

  // Check specific role if provided
  if (role && !user.roles.includes(role)) return <>{fallback}</>;

  // Check specific permission if provided
  if (permission && user.permissions[permission] !== true) return <>{fallback}</>;

  return <>{children}</>;
};
