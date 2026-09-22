import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { motionEase } from './marketplaceMotion';

type Props = {
  children: React.ReactNode;
  className?: string;
};

/** Transición al cambiar de ruta en el marketplace (entrada + salida). */
export const MarketplacePageTransition: React.FC<Props> = ({ children, className }) => {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.34, ease: motionEase }}
    >
      {children}
    </motion.div>
  );
};
