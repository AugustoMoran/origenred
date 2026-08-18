import React from 'react';
import { Outlet } from 'react-router-dom';
import { OrigenRedHeader } from '../marketplace/OrigenRedHeader';
import { MarketplaceCartDrawer } from '../marketplace/MarketplaceCartDrawer';
import { RouteChangeTracker } from '../RouteChangeTracker';
import { NetworkBackdrop } from '../branding/NetworkBackdrop';
import { OrigenRedLogo } from '../branding/OrigenRedLogo';

export const EcommerceLayout: React.FC = () => {
  return (
    <div className="marketplace-theme min-h-screen bg-slate-50 text-or-navy flex flex-col relative">
      <NetworkBackdrop variant="marketplace" />
      <RouteChangeTracker />
      <div className="relative z-10 flex flex-col min-h-screen">
        <OrigenRedHeader />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-slate-200/80 bg-white/90 backdrop-blur-sm py-12 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
              <OrigenRedLogo size="hero" />
              <p className="text-sm text-slate-500 text-center sm:text-right max-w-md">
                © {new Date().getFullYear()} OrigenRed. Conectamos orígenes, creamos oportunidades.
              </p>
            </div>
          </div>
        </footer>
        <MarketplaceCartDrawer />
      </div>
    </div>
  );
};
