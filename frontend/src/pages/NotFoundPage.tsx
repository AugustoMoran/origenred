import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { SEO } from '../components/ecommerce/SEO';
import { fadeUp, staggerContainer } from '../components/motion/marketplaceMotion';

export const NotFoundPage: React.FC = () => {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="max-w-lg mx-auto text-center py-20 space-y-6"
      initial={reduce ? false : 'hidden'}
      animate="visible"
      variants={staggerContainer}
    >
      <SEO title="Página no encontrada" />
      <motion.p variants={fadeUp} className="text-6xl font-extrabold text-or-navy">404</motion.p>
      <motion.h1 variants={fadeUp} className="text-2xl font-bold text-or-navy">
        No encontramos esta página
      </motion.h1>
      <motion.p variants={fadeUp} className="text-slate-500">
        El enlace puede estar roto o la página ya no existe.
      </motion.p>
      <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="px-6 py-3 bg-or-red hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
        >
          Ir al inicio
        </Link>
        <Link
          to="/buscar"
          className="px-6 py-3 border border-slate-200 text-or-navy font-semibold rounded-xl hover:bg-slate-50 transition-colors"
        >
          Explorar productos
        </Link>
      </motion.div>
    </motion.div>
  );
};
