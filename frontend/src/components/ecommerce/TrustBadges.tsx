import React from 'react';

interface TrustBadgesProps {
  mercadopagoEnabled?: boolean;
  envioPackEnabled?: boolean;
}

const Badge: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06]">
    <div className="w-10 h-10 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  </div>
);

export const TrustBadges: React.FC<TrustBadgesProps> = ({ mercadopagoEnabled = true, envioPackEnabled }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    {mercadopagoEnabled && (
      <Badge
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        }
        title="Pagos seguros"
        subtitle="Mercado Pago integrado"
      />
    )}
    <Badge
      icon={
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      }
      title="Envíos a todo el país"
      subtitle={envioPackEnabled ? 'Integración EnvíoPack' : 'Despacho rápido y seguro'}
    />
    <Badge
      icon={
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      }
      title="Compra protegida"
      subtitle="Atención personalizada"
    />
    <Badge
      icon={
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      }
      title="Especialistas en música"
      subtitle="Asesoramiento incluido"
    />
  </div>
);
