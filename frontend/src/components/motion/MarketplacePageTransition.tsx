import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { motionEase } from './marketplaceMotion';

type Props = {
  children: React.ReactNode;
  className?: string;
};

/** Transición suave al cambiar de ruta en el marketplace. */
export const MarketplacePageTransition: React.FC<Props> = ({ children, className }) => {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: motionEase }}
    >
      {children}
    </motion.div>
  );
};
