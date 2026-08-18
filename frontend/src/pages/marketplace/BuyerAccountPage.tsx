import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { SEO } from '../../components/ecommerce/SEO';
import { useGetMySellerProfileQuery } from '../../services/marketplaceApi';

export const BuyerAccountPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isSellerRole = user?.roles?.includes('vendedor_marketplace');
  const { data: sellerProfile } = useGetMySellerProfileQuery(undefined, { skip: !isSellerRole });
  const isAdmin = user?.roles?.includes('admin');

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto py-6 animate-fade-in">
      <SEO title="Mi perfil" description="Tu cuenta en OrigenRed" />

      <h1 className="text-2xl font-bold text-or-navy mb-6">Mi perfil</h1>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 mb-6">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Nombre</p>
          <p className="text-or-navy font-medium">{user.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email</p>
          <p className="text-or-navy">{user.email}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Tipo de cuenta</p>
          <p className="text-or-navy text-sm">
            {(user.roles || []).join(', ') || 'comprador'}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/cuenta/compras"
          className="p-4 bg-white border border-slate-100 rounded-xl hover:border-or-blue/30 hover:shadow-sm transition-all text-sm font-medium text-or-navy"
        >
          Mis compras
        </Link>
        <Link
          to="/cuenta/favoritos"
          className="p-4 bg-white border border-slate-100 rounded-xl hover:border-or-blue/30 hover:shadow-sm transition-all text-sm font-medium text-or-navy"
        >
          Favoritos
        </Link>
        <Link
          to="/cuenta/mensajes"
          className="p-4 bg-white border border-slate-100 rounded-xl hover:border-or-blue/30 hover:shadow-sm transition-all text-sm font-medium text-or-navy"
        >
          Mensajes
        </Link>
        <Link
          to="/cuenta/devoluciones"
          className="p-4 bg-white border border-slate-100 rounded-xl hover:border-or-blue/30 hover:shadow-sm transition-all text-sm font-medium text-or-navy"
        >
          Devoluciones
        </Link>

        {isAdmin && (
          <Link
            to="/dashboard"
            className="p-4 bg-or-red text-white rounded-xl hover:bg-red-600 transition-all text-sm font-semibold sm:col-span-2 text-center"
          >
            Panel administrador
          </Link>
        )}

        {sellerProfile && (
          <Link
            to="/vendedor/perfil"
            className="p-4 bg-or-blue text-white rounded-xl hover:bg-blue-800 transition-all text-sm font-semibold sm:col-span-2 text-center"
          >
            Perfil de vendedor
          </Link>
        )}

        {!sellerProfile && (
          <Link
            to="/vender"
            className="p-4 border-2 border-dashed border-or-red/30 text-or-red rounded-xl hover:bg-red-50 transition-all text-sm font-semibold sm:col-span-2 text-center"
          >
            Empezar a vender
          </Link>
        )}
      </div>
    </div>
  );
};
