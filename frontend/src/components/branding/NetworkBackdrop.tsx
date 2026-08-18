import React from 'react';
import { ORIGENRED_LOGO_SRC } from './OrigenRedLogo';

type Variant = 'dark' | 'light' | 'marketplace';

type Props = {
  variant?: Variant;
  showWatermark?: boolean;
  className?: string;
};

export const NetworkBackdrop: React.FC<Props> = ({
  variant = 'marketplace',
  showWatermark = true,
  className = '',
}) => {
  const isDark = variant === 'dark';

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden>
      {/* Red network glow */}
      <div
        className={`absolute top-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full blur-[120px] ${
          isDark ? 'bg-or-red/25' : 'bg-or-red/15'
        }`}
      />
      <div
        className={`absolute bottom-[-20%] left-[-15%] w-[50%] h-[50%] rounded-full blur-[140px] ${
          isDark ? 'bg-or-blue/20' : 'bg-or-blue/10'
        }`}
      />

      {/* SVG network mesh */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.12]"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="#E63946" strokeWidth="1.2" fill="none">
          <line x1="120" y1="80" x2="280" y2="200" />
          <line x1="280" y1="200" x2="450" y2="120" />
          <line x1="450" y1="120" x2="620" y2="240" />
          <line x1="620" y1="240" x2="900" y2="160" />
          <line x1="280" y1="200" x2="180" y2="380" />
          <line x1="450" y1="120" x2="520" y2="420" />
          <line x1="620" y1="240" x2="780" y2="360" />
          <line x1="180" y1="380" x2="520" y2="420" />
          <line x1="520" y1="420" x2="780" y2="360" />
          <line x1="780" y1="360" x2="1050" y2="480" />
          <line x1="520" y1="420" x2="340" y2="620" />
          <line x1="780" y1="360" x2="640" y2="680" />
        </g>
        <g fill="#E63946">
          <circle cx="120" cy="80" r="5" />
          <circle cx="280" cy="200" r="6" />
          <circle cx="450" cy="120" r="5" />
          <circle cx="620" cy="240" r="6" />
          <circle cx="900" cy="160" r="5" />
          <circle cx="180" cy="380" r="4" />
          <circle cx="520" cy="420" r="7" />
          <circle cx="780" cy="360" r="5" />
          <circle cx="1050" cy="480" r="4" />
          <circle cx="340" cy="620" r="5" />
          <circle cx="640" cy="680" r="6" />
        </g>
      </svg>

      {showWatermark && (
        <img
          src={ORIGENRED_LOGO_SRC}
          alt=""
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(85vw,560px)] opacity-[0.05] ${
            isDark ? 'opacity-[0.06]' : ''
          }`}
        />
      )}
    </div>
  );
};
