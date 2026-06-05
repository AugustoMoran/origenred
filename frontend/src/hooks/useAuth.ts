import { useSelector } from 'react-redux';
import { RootState } from '../store';

export const useAuth = () => {
  const { user, isAuthenticated, token } = useSelector((state: RootState) => state.auth);

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.roles.includes('admin')) return true;
    return user.permissions[permission] === true;
  };

  const hasRole = (role: string) => {
    if (!user) return false;
    return user.roles.includes(role);
  };

  const isAdmin = user?.roles.includes('admin') || false;

  return {
    user,
    isAuthenticated,
    token,
    hasPermission,
    hasRole,
    isAdmin,
  };
};
