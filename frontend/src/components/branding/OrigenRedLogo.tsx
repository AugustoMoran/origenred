import React from 'react';

/** Logo oficial OrigenRed — archivo en public/logooficialdefinitivo.png */
export const ORIGENRED_LOGO_SRC = '/logooficialdefinitivo.png';

type Props = {
  size?: 'sm' | 'nav' | 'md' | 'lg' | 'xl' | 'hero';
  /** Header: solo ícono + nombre (sin tagline del PNG). Footer: logo grande + tagline HTML */
  variant?: 'default' | 'header' | 'footer';
  showWordmark?: boolean;
  className?: string;
};

const sizeMap = {
  sm: 'h-10 w-auto max-w-[120px]',
  nav: 'h-14 sm:h-16 w-auto max-w-[200px] sm:max-w-[260px]',
  md: 'h-16 w-auto max-w-[180px]',
  lg: 'h-24 sm:h-28 w-auto max-w-[240px] sm:max-w-[300px]',
  xl: 'h-28 sm:h-32 w-auto max-w-[280px] sm:max-w-[340px]',
  hero: 'h-32 sm:h-40 w-auto max-w-[320px] sm:max-w-[400px]',
};

const OrigenRedTagline: React.FC<{ className?: string }> = ({ className = '' }) => (
  <p
    className={`font-semibold uppercase tracking-[0.12em] leading-snug text-center ${className}`}
  >
    <span className="text-slate-600">Conectamos orígenes, creamos </span>
    <span className="text-or-red">oportunidades</span>
  </p>
);

export const OrigenRedLogo: React.FC<Props> = ({
  size = 'md',
  variant = 'default',
  showWordmark = false,
  className = '',
}) => {
  if (variant === 'header') {
    return (
      <div className={`flex flex-col items-start justify-center ${className}`}>
        <div className="h-11 sm:h-[3.25rem] w-[7.5rem] sm:w-[9.5rem] overflow-hidden flex-shrink-0">
          <img
            src={ORIGENRED_LOGO_SRC}
            alt="OrigenRed"
            className="w-full h-auto min-h-[168%] max-w-none object-cover object-top"
            decoding="async"
          />
        </div>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`flex flex-col items-center sm:items-start gap-2 ${className}`}>
        <div className="h-28 sm:h-36 w-[11rem] sm:w-[14rem] overflow-hidden">
          <img
            src={ORIGENRED_LOGO_SRC}
            alt="OrigenRed"
            className="w-full h-auto min-h-[155%] max-w-none object-cover object-top"
            decoding="async"
          />
        </div>
        <OrigenRedTagline className="text-[11px] sm:text-xs max-w-[16rem]" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={ORIGENRED_LOGO_SRC}
        alt="OrigenRed"
        className={`${sizeMap[size]} object-contain object-left drop-shadow-md`}
      />
      {showWordmark && (
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          <span className="text-or-navy">Origen</span>
          <span className="text-or-red">Red</span>
        </span>
      )}
    </div>
  );
};
