import React from 'react';

/** Logo oficial OrigenRed — archivo en public/logooficialdefinitivo.png */
export const ORIGENRED_LOGO_SRC = '/logooficialdefinitivo.png';
const HEADER_ICON_SRC = '/origenred-logo.svg';

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
    className={`font-semibold uppercase tracking-[0.14em] leading-snug text-center ${className}`}
  >
    <span className="text-slate-600">Conectamos orígenes, creamos </span>
    <span className="text-or-red">oportunidades</span>
  </p>
);

const HeaderWordmark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`font-extrabold tracking-tight leading-none whitespace-nowrap ${className}`}
  >
    <span className="text-or-navy">Origen</span>
    <span className="text-or-red">Red</span>
  </span>
);

export const OrigenRedLogo: React.FC<Props> = ({
  size = 'md',
  variant = 'default',
  showWordmark = false,
  className = '',
}) => {
  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-2.5 sm:gap-3 min-w-0 ${className}`}>
        <img
          src={HEADER_ICON_SRC}
          alt=""
          className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 drop-shadow-sm"
          decoding="async"
        />
        <HeaderWordmark className="text-[1.45rem] sm:text-[1.75rem]" />
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`flex flex-col items-center sm:items-start gap-3 ${className}`}>
        <div className="flex items-center gap-3">
          <img
            src={HEADER_ICON_SRC}
            alt=""
            className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0"
            decoding="async"
          />
          <HeaderWordmark className="text-3xl sm:text-4xl" />
        </div>
        <OrigenRedTagline className="text-xs sm:text-sm max-w-[20rem]" />
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
      {showWordmark && <HeaderWordmark className="text-2xl sm:text-3xl" />}
    </div>
  );
};
