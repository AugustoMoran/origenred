import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from './MarketingScripts';

/** Envía page views a GA / Meta Pixel en cada navegación SPA */
export const RouteChangeTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
};
