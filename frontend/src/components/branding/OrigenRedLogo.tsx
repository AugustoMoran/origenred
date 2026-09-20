import React from 'react';

/** Logo vertical (PWA / favicon) */
export const ORIGENRED_LOGO_SRC = '/logooficialdefinitivo.png';
/** Logo oficial web (fondo claro; archivo ancho — usar solo para recorte del ícono) */
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

const OrigenRedWordmark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`font-extrabold tracking-tight leading-none whitespace-nowrap ${className}`}
    aria-hidden
  >
    <span className="text-or-navy">Origen</span>
    <span className="text-or-red">Red</span>
  </span>
);

/**
 * Ícono “O” del logo oficial (recorte superior izquierdo del PNG ancho).
 * `imageHeight` controla el zoom; el contenedor recorta a un cuadrado.
 */
const OfficialIconMark: React.FC<{
  boxClass: string;
  imageHeight: string;
  className?: string;
}> = ({ boxClass, imageHeight, className = '' }) => (
  <div className={`relative overflow-hidden shrink-0 ${boxClass} ${className}`}>
    <img
      src={ORIGENRED_LOGO_WEB_SRC}
      alt=""
      className={`absolute top-0 left-0 max-w-none w-auto ${imageHeight}`}
      decoding="async"
      aria-hidden
    />
  </div>
);

export const OrigenRedLogo: React.FC<Props> = ({
  size = 'md',
  variant = 'default',
  showWordmark = false,
  className = '',
}) => {
  if (variant === 'header') {
    return (
      <div
        className={`flex items-center gap-2.5 sm:gap-3 min-w-0 ${className}`}
        aria-label="OrigenRed"
      >
        <OfficialIconMark
          boxClass="w-12 h-12 sm:w-14 sm:h-14"
          imageHeight="h-[10.5rem] sm:h-[12.5rem]"
        />
        <OrigenRedWordmark className="text-[1.35rem] sm:text-[1.75rem] md:text-[1.9rem]" />
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 ${className}`}>
        <div className="flex items-center gap-3 sm:gap-4">
          <OfficialIconMark
            boxClass="w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20"
            imageHeight="h-[14rem] sm:h-[16rem]"
          />
          <OrigenRedWordmark className="text-3xl sm:text-4xl" />
        </div>
        <OrigenRedTagline className="text-xs sm:text-sm max-w-md sm:max-w-sm sm:pt-1" />
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
      {showWordmark && <OrigenRedWordmark className="text-2xl sm:text-3xl" />}
    </div>
  );
};
