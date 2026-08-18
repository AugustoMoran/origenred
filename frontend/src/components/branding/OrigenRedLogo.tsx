import React from 'react';

const LOGO_SRC = '/origenred-logo.png';

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showWordmark?: boolean;
  className?: string;
};

const sizeMap = {
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-24 w-24 sm:h-28 sm:w-28',
  xl: 'h-32 w-32 sm:h-36 sm:w-36',
  hero: 'h-40 w-40 sm:h-48 sm:w-48',
};

/** Logo oficial OrigenRed (PNG en public/) */
export const OrigenRedLogo: React.FC<Props> = ({ size = 'md', showWordmark = false, className = '' }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={LOGO_SRC}
        alt="OrigenRed"
        className={`${sizeMap[size]} object-contain drop-shadow-md`}
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

export const ORIGENRED_LOGO_SRC = LOGO_SRC;
