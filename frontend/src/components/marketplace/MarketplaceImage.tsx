import React, { useEffect, useState } from 'react';
import { resolveMarketplaceImageUrl } from '../../utils/marketplaceMediaUrl';

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
};

export const MarketplaceImage: React.FC<Props> = ({ src, alt, className, loading = 'lazy' }) => {
  const [current, setCurrent] = useState(() => resolveMarketplaceImageUrl(src));

  useEffect(() => {
    setCurrent(resolveMarketplaceImageUrl(src));
  }, [src]);

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => {
        setCurrent('/logooficialdefinitivo.png');
      }}
    />
  );
};
