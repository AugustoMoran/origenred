import React, { useEffect, useState } from 'react';
import { useStore } from 'react-redux';
import { bootstrapAuthSession, tryRefreshSession } from '../services/baseQueryWithReauth';

const REFRESH_INTERVAL_MS = 45 * 60 * 1000;

export const AuthBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bootstrapAuthSession(store)
      .catch(() => {})
      .finally(() => setReady(true));
  }, [store]);

  useEffect(() => {
    if (!ready) return;

    const refreshIfAuthenticated = () => {
      const isAuthenticated = (store.getState() as { auth?: { isAuthenticated?: boolean } })?.auth?.isAuthenticated;
      if (!isAuthenticated) return;

      tryRefreshSession(
        { getState: store.getState, dispatch: store.dispatch },
        { logoutOnFail: false }
      ).catch(() => {});
    };

    const interval = window.setInterval(refreshIfAuthenticated, REFRESH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshIfAuthenticated();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [ready, store]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        Cargando sesión...
      </div>
    );
  }

  return <>{children}</>;
};
