import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { OrigenRedHeader } from '../marketplace/OrigenRedHeader';
import { MarketplaceCartDrawer } from '../marketplace/MarketplaceCartDrawer';
import { RouteChangeTracker } from '../RouteChangeTracker';
import { NetworkBackdrop } from '../branding/NetworkBackdrop';
import { OrigenRedLogo } from '../branding/OrigenRedLogo';
import { MarketplacePageTransition } from '../motion/MarketplacePageTransition';

export const EcommerceLayout: React.FC = () => {
  const { pathname } = useLocation();
  const isOrderChat = /\/cuenta\/chat\//.test(pathname);

  return (
    <div className="marketplace-theme min-h-screen bg-slate-50 text-or-navy flex flex-col relative">
      <NetworkBackdrop variant="marketplace" />
      <RouteChangeTracker />
      <div className="relative z-10 flex flex-col min-h-screen">
        <OrigenRedHeader />
        <main className="flex-1">
          {isOrderChat ? (
            <Outlet />
          ) : (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <MarketplacePageTransition key={pathname}>
                <Outlet />
              </MarketplacePageTransition>
            </div>
          )}
        </main>
        {!isOrderChat && (
        <footer className="border-t border-slate-200/80 bg-white/90 backdrop-blur-sm py-12 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <OrigenRedLogo variant="footer" />
              <p className="text-sm text-slate-500 lg:text-right max-w-md lg:pt-2">
                © {new Date().getFullYear()} OrigenRed. Conectamos orígenes, creamos oportunidades.
              </p>
            </div>
          </div>
        </footer>
        )}
        <MarketplaceCartDrawer />
      </div>
    </div>
  );
};
