import React from 'react';

/** Logo oficial OrigenRed — archivo en public/logooficialdefinitivo.png */
export const ORIGENRED_LOGO_SRC = '/logooficialdefinitivo.png';

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
    className={`font-semibold uppercase tracking-[0.14em] leading-snug text-center sm:text-left ${className}`}
  >
    <span className="text-slate-600">Conectamos orígenes, creamos </span>
    <span className="text-or-red">oportunidades</span>
  </p>
);

/** Recorte superior del PNG oficial (ícono + nombre), sin la frase chica del archivo */
const OfficialLogoCrop: React.FC<{
  className?: string;
  boxClassName: string;
  cropMinHeight?: string;
}> = ({ className = '', boxClassName, cropMinHeight = '175%' }) => (
  <div className={`overflow-hidden flex-shrink-0 ${boxClassName}`}>
    <img
      src={ORIGENRED_LOGO_SRC}
      alt="OrigenRed"
      className={`w-full h-auto max-w-none object-cover object-top ${className}`}
      style={{ minHeight: cropMinHeight }}
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
      <OfficialLogoCrop
        boxClassName={`h-[3.5rem] sm:h-[4.5rem] w-[11rem] sm:w-[15rem] ${className}`}
        cropMinHeight="185%"
      />
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`flex flex-col items-center sm:items-start gap-3 ${className}`}>
        <OfficialLogoCrop
          boxClassName="h-36 sm:h-44 w-[14rem] sm:w-[18rem]"
          cropMinHeight="155%"
        />
        <OrigenRedTagline className="text-xs sm:text-sm max-w-[18rem]" />
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
