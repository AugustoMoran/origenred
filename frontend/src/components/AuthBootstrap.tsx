import React, { useEffect, useState } from 'react';
import { useStore } from 'react-redux';
import { bootstrapAuthSession } from '../services/baseQueryWithReauth';

export const AuthBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bootstrapAuthSession(store)
      .catch(() => {})
      .finally(() => setReady(true));
  }, [store]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center text-slate-500 text-sm">
        Cargando sesión...
      </div>
    );
  }

  return <>{children}</>;
};
