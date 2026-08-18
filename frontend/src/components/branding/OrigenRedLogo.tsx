import React from 'react';

/** Logo oficial OrigenRed — archivo en public/logooficialdefinitivo.png */
export const ORIGENRED_LOGO_SRC = '/logooficialdefinitivo.png';

type Props = {
  size?: 'sm' | 'nav' | 'md' | 'lg' | 'xl' | 'hero';
  showWordmark?: boolean;
  className?: string;
};

const sizeMap = {
  sm: 'h-10 w-auto max-w-[120px]',
  nav: 'h-12 sm:h-14 w-auto max-w-[160px] sm:max-w-[200px]',
  md: 'h-16 w-auto max-w-[180px]',
  lg: 'h-24 sm:h-28 w-auto max-w-[240px] sm:max-w-[300px]',
  xl: 'h-28 sm:h-32 w-auto max-w-[280px] sm:max-w-[340px]',
  hero: 'h-36 sm:h-44 w-auto max-w-[360px] sm:max-w-[420px]',
};

export const OrigenRedLogo: React.FC<Props> = ({ size = 'md', showWordmark = false, className = '' }) => {
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
