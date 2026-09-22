import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { motionEase } from './marketplaceMotion';

type Props = {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
  panelClassName?: string;
};

export const MotionModal: React.FC<Props> = ({
  children,
  onClose,
  className = 'fixed inset-0 z-50 flex items-center justify-center p-4',
  panelClassName = 'w-full',
}) => {
  const reduce = useReducedMotion();

  return (
    <div className={className}>
      <motion.button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/40"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 ${panelClassName}`}
        initial={reduce ? false : { opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: motionEase }}
      >
        {children}
      </motion.div>
    </div>
  );
};
