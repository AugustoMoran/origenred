import React from 'react';

const LOGO_SRC = '/origenred-logo.svg';

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showWordmark?: boolean;
  className?: string;
};

const sizeMap = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
  xl: 'h-28 w-28',
  hero: 'h-36 w-36 sm:h-44 sm:w-44',
};

export const OrigenRedLogo: React.FC<Props> = ({ size = 'md', showWordmark = false, className = '' }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={LOGO_SRC}
        alt="OrigenRed"
        className={`${sizeMap[size]} object-contain drop-shadow-lg`}
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
