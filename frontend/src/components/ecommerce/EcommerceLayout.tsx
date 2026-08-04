import React from 'react';
import { Outlet } from 'react-router-dom';
import { OrigenRedHeader } from '../marketplace/OrigenRedHeader';
import { MarketplaceCartDrawer } from '../marketplace/MarketplaceCartDrawer';
import { RouteChangeTracker } from '../RouteChangeTracker';

export const EcommerceLayout: React.FC = () => {
  return (
    <div className="marketplace-theme min-h-screen bg-slate-50 text-or-navy flex flex-col">
      <RouteChangeTracker />
      <OrigenRedHeader />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-slate-200 bg-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/origenred-logo.png" alt="OrigenRed" className="h-7 w-7" />
              <span className="font-bold text-or-navy">
                Origen<span className="text-or-red">Red</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} OrigenRed. Conectamos orígenes, creamos oportunidades.
            </p>
          </div>
        </div>
      </footer>
      <MarketplaceCartDrawer />
    </div>
  );
};
