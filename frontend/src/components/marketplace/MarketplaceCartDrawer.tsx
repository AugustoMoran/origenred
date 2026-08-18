import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  selectMarketplaceCartItems,
  selectMarketplaceCartTotal,
  selectMarketplaceCartOpen,
  setMarketplaceCartOpen,
  removeMarketplaceItem,
  updateMarketplaceQuantity,
} from '../../store/marketplaceCartSlice';

export const MarketplaceCartDrawer: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isOpen = useSelector(selectMarketplaceCartOpen);
  const items = useSelector(selectMarketplaceCartItems);
  const total = useSelector(selectMarketplaceCartTotal);

  if (!isOpen) return null;

  const format = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

  return (
    <>
      <button
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]"
        onClick={() => dispatch(setMarketplaceCartOpen(false))}
        aria-label="Cerrar carrito"
      />
      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white border-l border-slate-200 flex flex-col shadow-2xl animate-slide-up">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-or-navy">Carrito</h2>
          <button
            onClick={() => dispatch(setMarketplaceCartOpen(false))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-or-navy hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-12">
              <p className="text-sm">Tu carrito está vacío</p>
              <Link to="/buscar" onClick={() => dispatch(setMarketplaceCartOpen(false))} className="text-or-red text-sm font-medium">
                Explorar productos →
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.listingId} className="flex gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                <div className="w-16 h-16 rounded-lg bg-white overflow-hidden flex-shrink-0 border border-slate-100">
                  <img src={item.imageUrl || '/origenred-logo.png'} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400">{item.sellerName}</p>
                  <p className="text-sm font-medium text-or-navy truncate">{item.title}</p>
                  <p className="text-sm font-bold text-or-navy mt-0.5">{format(item.price)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() =>
                        dispatch(updateMarketplaceQuantity({ listingId: item.listingId, quantity: item.quantity - 1 }))
                      }
                      className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:border-or-blue"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() =>
                        dispatch(updateMarketplaceQuantity({ listingId: item.listingId, quantity: item.quantity + 1 }))
                      }
                      className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:border-or-blue"
                    >
                      +
                    </button>
                    <button
                      onClick={() => dispatch(removeMarketplaceItem(item.listingId))}
                      className="ml-auto text-xs text-red-500 hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-5 border-t border-slate-100 space-y-3">
            <div className="flex justify-between font-bold text-or-navy text-lg">
              <span>Subtotal</span>
              <span>{format(total)}</span>
            </div>
            <p className="text-xs text-slate-400">El envío se calcula en el checkout según tu código postal</p>
            <button
              onClick={() => {
                dispatch(setMarketplaceCartOpen(false));
                navigate('/comprar');
              }}
              className="w-full py-3 bg-or-red hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
            >
              Finalizar compra
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
