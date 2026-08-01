import React from 'react';
import { Outlet } from 'react-router-dom';
import { StoreHeader } from './StoreHeader';
import { CartDrawer } from './CartDrawer';
import { PromoBar } from './PromoBar';
import { FloatingSocialButtons } from './FloatingSocialButtons';
import { useGetPublicSettingsQuery } from '../../services/settingsApi';

export const EcommerceLayout: React.FC = () => {
  const { data: settings } = useGetPublicSettingsQuery();

  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 flex flex-col">
      <PromoBar freeShippingThreshold={settings?.freeShippingThreshold} />
      <StoreHeader />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-white/[0.05] py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} {(import.meta as any).env?.VITE_COMPANY_NAME || 'Tienda'}. Todos los derechos reservados.
        </div>
      </footer>
      <CartDrawer />
      <FloatingSocialButtons />
    </div>
  );
};
