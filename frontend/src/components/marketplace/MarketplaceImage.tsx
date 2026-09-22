import React, { useEffect, useMemo, useState } from 'react';
import { buildImageFallbackUrls } from '../../utils/marketplaceMediaUrl';

const PLACEHOLDER = '/logooficialdefinitivo.png';

type Props = {
  src?: string | null;
  storageKey?: string | null;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
};

export const MarketplaceImage: React.FC<Props> = ({
  src,
  storageKey,
  alt,
  className,
  loading = 'lazy',
}) => {
  const candidates = useMemo(
    () => buildImageFallbackUrls(src, storageKey),
    [src, storageKey]
  );

  const [index, setIndex] = useState(0);
  const current = index < candidates.length ? candidates[index] : PLACEHOLDER;

  useEffect(() => {
    setIndex(0);
  }, [src, storageKey]);

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => {
        setIndex((prev) => prev + 1);
      }}
    />
  );
};
