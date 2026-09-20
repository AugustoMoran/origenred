import React from 'react';

/** Logo vertical (PWA / iconos) */
export const ORIGENRED_LOGO_SRC = '/logooficialdefinitivo.png';
/** Logo oficial web (fondo claro) */
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

/**
 * El PNG oficial es muy ancho (logo a la izquierda + margen vacío).
 * Ampliamos la imagen y recortamos el contenedor para ver ícono + nombre nítidos.
 */
const WebLogoMark: React.FC<{
  frameClass: string;
  imageClass: string;
  className?: string;
}> = ({ frameClass, imageClass, className = '' }) => (
  <div className={`overflow-hidden ${frameClass} ${className}`}>
    <img
      src={ORIGENRED_LOGO_WEB_SRC}
      alt="OrigenRed"
      className={`block max-w-none w-auto object-left ${imageClass}`}
      decoding="async"
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
      <WebLogoMark
        frameClass="h-[3.75rem] sm:h-[4.5rem] w-[8.25rem] sm:w-[10rem] shrink-0"
        imageClass="h-[11.5rem] sm:h-[14rem]"
        className={className}
      />
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`flex flex-col items-start gap-3 ${className}`}>
        <WebLogoMark
          frameClass="h-[5.25rem] sm:h-[6.25rem] w-[10rem] sm:w-[12rem]"
          imageClass="h-[13rem] sm:h-[15.5rem]"
        />
        <OrigenRedTagline className="text-xs sm:text-sm max-w-[22rem]" />
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
