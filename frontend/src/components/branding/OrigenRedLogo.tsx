import React from 'react';

/** Logo vertical (PWA / iconos) */
export const ORIGENRED_LOGO_SRC = '/logooficialdefinitivo.png';
/** Logo oficial web (fondo claro; archivo ancho — se recorta a la izquierda) */
export const ORIGENRED_LOGO_WEB_SRC = '/origenred-logo-horizontal.png';

type Props = {
  size?: 'sm' | 'nav' | 'md' | 'lg' | 'xl' | 'hero';
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
    className={`font-semibold uppercase tracking-[0.12em] sm:tracking-[0.14em] leading-snug ${className}`}
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
      <img
        src={ORIGENRED_LOGO_WEB_SRC}
        alt="OrigenRed"
        className={`h-12 sm:h-14 w-[10.5rem] sm:w-[13rem] object-cover object-[left_12%] block flex-shrink-0 ${className}`}
        decoding="async"
      />
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`flex flex-col items-start gap-3 ${className}`}>
        <img
          src={ORIGENRED_LOGO_WEB_SRC}
          alt="OrigenRed"
          className="h-[4.75rem] sm:h-24 w-[12rem] sm:w-[15rem] object-cover object-[left_10%]"
          decoding="async"
        />
        <OrigenRedTagline className="text-xs sm:text-sm max-w-[22rem] pl-0.5" />
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
