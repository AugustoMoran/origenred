import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetProductsQuery, useGetProductStockByBranchQuery } from '../services/inventoryApi';
import { useCreateSaleMutation, useLazyGetSaleInvoiceQuery, useLazyGetSaleRemitoQuery } from '../services/salesApi';
import { useGetBranchesQuery } from '../services/branchApi';
import { useGetCategoriesQuery } from '../services/categoryApi';
import { useGetSuppliersQuery } from '../services/supplierApi';

interface CartItem {
  product: string;
  name: string;
  price: number;
  quantity: number;
  ivaRate?: number;
}

const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transferencia', label: 'Transferencia' },
] as const;

const StockMini = ({ productId }: { productId: string }) => {
  const { data: stocks, isLoading } = useGetProductStockByBranchQuery(productId);
  if (isLoading) return <div className="h-4 w-12 bg-slate-800 animate-pulse rounded" />;

  const getBranchLabel = (stockItem: any) => {
    const branchRef = stockItem?.branch ?? stockItem?.branchId;

    if (branchRef && typeof branchRef === 'object' && branchRef.name) {
      return String(branchRef.name);
    }

    if (typeof stockItem?.branchName === 'string' && stockItem.branchName.trim()) {
      return stockItem.branchName.trim();
    }

    return 'Sucursal';
  };

  const getBranchKey = (stockItem: any, idx: number) => {
    const branchRef = stockItem?.branch ?? stockItem?.branchId;

    if (typeof branchRef === 'string' || typeof branchRef === 'number') {
      return `${branchRef}`;
    }

    if (branchRef && typeof branchRef === 'object' && branchRef._id) {
      return String(branchRef._id);
    }

    return `branch-stock-${idx}`;
  };
  
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {(stocks || []).map((s: any, idx: number) => {
        const branchLabel = getBranchLabel(s);
        return (
        <span key={getBranchKey(s, idx)} className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5" title={branchLabel}>
           {branchLabel.substring(0,2).toUpperCase()}: 
           <b className="ml-1 text-white">{s.stock ?? s.quantity ?? 0}</b>
        </span>
      )})}
    </div>
  );
};

export const POS = () => {
  const { user } = useSelector((state: any) => state.auth);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const hasActiveFilters = Boolean(search || categoryFilter || supplierFilter);

  const { data: products = [] } = useGetProductsQuery();
  const { data: branches = [] } = useGetBranchesQuery({});
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: suppliers = [] } = useGetSuppliersQuery();
  const [createSale, { isLoading: isSaving }] = useCreateSaleMutation();
  const [downloadInvoice] = useLazyGetSaleInvoiceQuery();
  const [downloadRemito] = useLazyGetSaleRemitoQuery();
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [billingMode, setBillingMode] = useState<'fiscal' | 'nofiscal'>('fiscal');
  const [clientData, setClientData] = useState({ name: '', cuit: '', address: '' });
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch || '');

  const isAdmin = user?.roles?.includes('admin') || user?.role === 'admin';
  const hasAssignedBranch = Boolean(user?.branch);

  useEffect(() => {
    if (isAdmin && !selectedBranchId && branches.length > 0) {
      setSelectedBranchId(branches[0]._id);
    }
  }, [isAdmin, selectedBranchId, branches]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredProducts = (products ?? []).filter((p: any) => {
    const name = String(p?.name || '').toLowerCase();
    const sku = String(p?.sku || '').toLowerCase();
    const barcode = String(p?.barcode || '').toLowerCase();

    const matchesText = !normalizedSearch ||
      name.includes(normalizedSearch) ||
      sku.includes(normalizedSearch) ||
      barcode.includes(normalizedSearch);

    const matchesCategory = !categoryFilter || String(p?.category || '') === categoryFilter;
    const supplierId = typeof p?.supplier === 'object' ? p?.supplier?._id : p?.supplier;
    const matchesSupplier = !supplierFilter || String(supplierId || '') === String(supplierFilter);

    return matchesText && matchesCategory && matchesSupplier;
  });

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const addToCart = (p: any) => {
    // Verificar stock global antes de agregar (opcional, el backend validará por sucursal)
    if (p.stock <= 0) {
      if (!window.confirm('Este producto no tiene stock global. ¿Continuar?')) return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.product === p._id);
      if (existing) {
        return prev.map(i =>
          i.product === p._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { 
        product: p._id, 
        name: p.name, 
        price: p.price, 
        quantity: 1,
        ivaRate: p.iva || 21
      }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.product !== id));
    } else {
      setCart(prev => prev.map(i => (i.product === id ? { ...i, quantity: qty } : i)));
    }
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.product !== id));

  const handleDownload = async (id: string, invoiceNumber: string) => {
    try {
      const blob = await downloadInvoice(id).unwrap();
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factura-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Error al descargar la factura');
    }
  };

  const handleDownloadRemito = async (id: string, remitoNumber: string) => {
    try {
      const blob = await downloadRemito({ id, mode: 'logistico' }).unwrap();
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Remito-${remitoNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Error al descargar el remito');
    }
  };

  const handleFinishSale = async () => {
    if (cart.length === 0) return;

    if (isAdmin && !selectedBranchId) {
      alert('Debe seleccionar una sucursal para realizar la venta.');
      return;
    }

    if (!isAdmin && !hasAssignedBranch) {
      alert('No tenés sucursal asignada. Solicitá al administrador que te asigne una sucursal.');
      return;
    }

    try {
      const invoiceType = billingMode === 'nofiscal' ? 'NONE' : (clientData.cuit ? 'A' : 'B');

      const salePayload: any = {
        items: cart,
        paymentMethod,
        invoiceType,
        clientName: clientData.name,
        clientCuit: clientData.cuit,
        clientAddress: clientData.address,
      };

      if (isAdmin) {
        salePayload.branchId = selectedBranchId;
      }

      const result: any = await createSale(salePayload).unwrap();

      if (invoiceType !== 'NONE' && window.confirm('¡Venta registrada! ¿Descargar comprobante?')) {
        await handleDownload(result._id, result.invoiceNumber);
      }

      if (invoiceType === 'NONE') {
        if (window.confirm('Venta no fiscal registrada. ¿Descargar remito?')) {
          await handleDownloadRemito(result._id, result.remitoNumber || result.invoiceNumber || result._id);
        }
      }

      setCart([]);
      setClientData({ name: '', cuit: '', address: '' });
    } catch (err: any) {
      alert(`Error: ${err.data?.message || err.message}`);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100dvh-140px)] lg:h-[calc(100dvh-64px)] -mx-4 sm:-mx-6 lg:-mx-8 -my-6 lg:-my-8 overflow-hidden">
      
      {/* ── Left Sidebar (Cart) ── */}
      <div className="w-full lg:w-[360px] xl:w-[400px] 2xl:w-[430px] lg:min-w-[360px] lg:flex-shrink-0 bg-slate-900 lg:border-r border-b lg:border-b-0 border-white/5 flex flex-col">
        <div className="p-4 sm:p-6 border-b border-white/5">
          <h2 className="text-xl font-bold flex items-center gap-2 whitespace-nowrap">
            <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Nueva Venta
          </h2>
          
          {/* Sucursal Selector */}
          <div className="mt-4">
             <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5 block">Sucursal</label>
             {isAdmin ? (
               <select 
                   className="input py-2 text-sm"
                 value={selectedBranchId}
                 onChange={(e) => setSelectedBranchId(e.target.value)}
               >
                 <option value="">Seleccionar Sucursal...</option>
                 {branches?.map((b: any) => (
                   <option key={b._id} value={b._id}>{b.name}</option>
                 ))}
               </select>
             ) : (
               <>
                 <div className="badge-gray w-full justify-start py-2 px-3 text-sm">
                   <svg className="w-3.5 h-3.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                   </svg>
                   {branches?.find((b: any) => b._id === user?.branch)?.name || 'Sin sucursal asignada'}
                 </div>
                 {!hasAssignedBranch && (
                   <div className="mt-2 text-[11px] text-amber-300">
                     ⚠️ No tenés sucursal asignada. Pedile al administrador que te asigne una para poder vender.
                   </div>
                 )}
               </>
             )}
          </div>

          <div className="mt-4">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5 block">Tipo de venta</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBillingMode('fiscal')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  billingMode === 'fiscal'
                    ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                Facturar (AFIP)
              </button>
              <button
                type="button"
                onClick={() => setBillingMode('nofiscal')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  billingMode === 'nofiscal'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                Cotización
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-[40dvh] lg:max-h-none lg:flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-50">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm font-medium">Carrito vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                 <div className="flex-1">
                    <h4 className="text-sm font-medium text-white truncate max-w-[160px] sm:max-w-[220px]">{item.name}</h4>
                    <p className="text-xs text-brand-400 font-mono">${item.price.toLocaleString()}</p>
                 </div>
                 <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1">
                    <button onClick={() => updateQty(item.product, item.quantity - 1)} className="p-1 hover:text-white transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M20 12H4" strokeWidth={2} strokeLinecap="round" /></svg>
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-white tabular-nums">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product, item.quantity + 1)} className="p-1 hover:text-white transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" strokeWidth={2} strokeLinecap="round" /></svg>
                    </button>
                 </div>
                 <button onClick={() => removeItem(item.product)} className="p-2 text-slate-500 hover:text-rose-400 transition-colors">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2}/></svg>
                 </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 sm:p-6 bg-slate-900/50 border-t border-white/5 space-y-4 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
          <div className="space-y-2">
            <div className="flex justify-between text-slate-400 text-sm">
              <span>Subtotal</span>
              <span className="tabular-nums">${(total / 1.21).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-sm">
              <span>IVA (21%)</span>
              <span className="tabular-nums">${(total - (total / 1.21)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-white font-bold text-xl pt-2 border-t border-white/5">
              <span>Total</span>
              <span className="text-brand-400 tabular-nums">${total.toLocaleString()}</span>
            </div>
          </div>
          <button 
            disabled={cart.length === 0 || isSaving}
            onClick={handleFinishSale}
            className="btn-primary w-full py-4 text-base shadow-xl shadow-brand-500/10 disabled:opacity-50 disabled:grayscale"
          >
            {isSaving ? 'Procesando...' : 'Finalizar Venta'}
          </button>
        </div>
      </div>

      {/* ── Right Content (Products) ── */}
      <div className="flex-1 flex flex-col bg-slate-950 min-h-[45dvh]">
        <div className="p-4 sm:p-6 border-b border-white/5 space-y-3 sm:space-y-4">
          <div className="flex flex-col 2xl:flex-row items-stretch 2xl:items-center gap-3 sm:gap-4">
            <div className="relative flex-1 min-w-[260px]">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre, código o SKU..."
                className="input w-full pl-12 py-3 bg-white/5 text-slate-100 placeholder:text-slate-400 caret-brand-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full 2xl:w-auto 2xl:flex 2xl:items-center 2xl:gap-3">
              <select className="input py-2 text-sm w-full 2xl:w-52" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">Todas las categorías</option>
                {categories.map((c: any) => (
                  <option key={c._id} value={c.name}>{c.name}</option>
                ))}
              </select>

              <select className="input py-2 text-sm w-full 2xl:w-52" value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
                <option value="">Todos los proveedores</option>
                {suppliers.map((s: any) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>

              <button
                type="button"
                className="btn-secondary py-2 text-sm w-full 2xl:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('');
                  setSupplierFilter('');
                }}
              >
                Limpiar filtros
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-start 2xl:justify-end">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setPaymentMethod(m.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  paymentMethod === m.id 
                    ? 'bg-brand-500/20 border-brand-500 text-brand-400' 
                    : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map((p: any) => (
              <button
                key={p._id}
                onClick={() => addToCart(p)}
                className="group p-4 bg-slate-900 border border-white/5 rounded-2xl text-left hover:border-brand-500/50 transition-all hover:shadow-2xl hover:shadow-brand-500/10 relative overflow-hidden active:scale-95"
              >
                <div className="aspect-square bg-slate-800 rounded-xl mb-4 overflow-hidden relative">
                   {p.imageUrl ? (
                     <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-slate-700">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={1.5} /></svg>
                     </div>
                   )}
                   <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-brand-500 text-white rounded-full p-2 shadow-lg">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" strokeWidth={2.5}/></svg>
                      </div>
                   </div>
                </div>
                
                <h3 className="font-bold text-white text-sm line-clamp-2 min-h-[40px] leading-tight">{p.name}</h3>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter tabular-nums">{p.sku}</p>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-lg font-bold text-brand-400 tabular-nums">${p.price.toLocaleString()}</span>
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.stock <= p.minStock ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {p.stock} un.
                  </div>
                </div>
                
                {/* Stock por sucursal breakdown mini */}
                <StockMini productId={p._id} />
              </button>
            ))}
          </div>
        </div>
        
        {/* Footer client selector (Compact) */}
        <div className="p-4 bg-slate-900 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
           <input 
             className="input py-2 text-sm text-slate-100 placeholder:text-slate-300 bg-[#0B1731] border-white/15" 
             placeholder="Nombre del Cliente"
             value={clientData.name}
             onChange={e => setClientData({...clientData, name: e.target.value})}
           />
           <input 
             className="input py-2 text-sm text-slate-100 placeholder:text-slate-300 bg-[#0B1731] border-white/15" 
             placeholder="CUIT/CUIL (Opcional p/ Factura A)"
             value={clientData.cuit}
             onChange={e => setClientData({...clientData, cuit: e.target.value})}
           />
           <input 
             className="input py-2 text-sm text-slate-100 placeholder:text-slate-300 bg-[#0B1731] border-white/15" 
             placeholder="Dirección"
             value={clientData.address}
             onChange={e => setClientData({...clientData, address: e.target.value})}
           />
        </div>
      </div>
    </div>
  );
};

