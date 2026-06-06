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

  const normalizedRoles = [
    ...(Array.isArray((user as any).roles) ? (user as any).roles : []),
    (user as any).role,
  ]
    .filter(Boolean)
    .map((r: any) => String(r).trim().toLowerCase());

  const permissions = (user as any).permissions || {};

  // Admin has access to everything
  if (normalizedRoles.includes('admin')) return <>{children}</>;

  // Check specific role if provided
  if (role && !normalizedRoles.includes(String(role).trim().toLowerCase())) return <>{fallback}</>;

  // Check specific permission if provided
  if (permission && permissions[permission] !== true) return <>{fallback}</>;

  return <>{children}</>;
};
