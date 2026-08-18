import React from 'react';

/** Logo oficial OrigenRed — archivo en public/logooficialdefinitivo.png */
export const ORIGENRED_LOGO_SRC = '/logooficialdefinitivo.png';

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showWordmark?: boolean;
  className?: string;
};

const sizeMap = {
  sm: 'h-14 w-auto max-w-[140px]',
  md: 'h-20 w-auto max-w-[200px]',
  lg: 'h-28 sm:h-36 w-auto max-w-[280px] sm:max-w-[360px]',
  xl: 'h-36 sm:h-44 w-auto max-w-[360px] sm:max-w-[440px]',
  hero: 'h-44 sm:h-56 w-auto max-w-[440px] sm:max-w-[520px]',
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
