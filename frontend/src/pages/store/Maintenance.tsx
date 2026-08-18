import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/ecommerce/SEO';
import { useGetPublicSettingsQuery } from '../../services/settingsApi';

const brandLogo = '/logooficialdefinitivo.png';

export const Maintenance: React.FC = () => {
  const { data: settings } = useGetPublicSettingsQuery();
  const storeName = settings?.storeName || (import.meta as any).env?.VITE_COMPANY_NAME || 'Tienda';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] px-4">
      <SEO title="Mantenimiento" description="La tienda está en mantenimiento" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-900/20 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-amber-900/15 rounded-full blur-[160px]" />
      </div>

      <div className="w-full max-w-md relative z-10 text-center animate-slide-up">
        <div className="glass rounded-2xl p-10 space-y-6">
          <div className="w-16 h-16 rounded-xl bg-white/90 mx-auto flex items-center justify-center ring-1 ring-white/30 overflow-hidden">
            <img src={brandLogo} alt="Logo" className="w-12 h-12 object-contain" />
          </div>

          <div>
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">{storeName}</h1>
            <p className="text-amber-400 font-semibold mt-2">En mantenimiento</p>
          </div>

          <p className="text-slate-400 text-sm leading-relaxed">
            {settings?.maintenanceMessage ||
              'Estamos realizando mejoras en la tienda. Volvé a intentar en unos minutos.'}
          </p>

          <Link to="/login" className="btn-secondary inline-flex text-sm">
            Acceso staff
          </Link>
        </div>
      </div>
    </div>
  );
};
