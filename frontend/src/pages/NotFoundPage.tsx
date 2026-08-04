import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/ecommerce/SEO';

export const NotFoundPage: React.FC = () => (
  <div className="max-w-lg mx-auto text-center py-20 space-y-6">
    <SEO title="Página no encontrada" />
    <p className="text-6xl font-extrabold text-or-navy">404</p>
    <h1 className="text-2xl font-bold text-or-navy">No encontramos esta página</h1>
    <p className="text-slate-500">
      El enlace puede estar roto o la página ya no existe.
    </p>
    <div className="flex flex-wrap justify-center gap-3">
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
    </div>
  </div>
);
