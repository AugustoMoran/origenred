import React, { useState } from 'react';
import { useCreateReturnRequestMutation } from '../../services/marketplaceApi';

const REASONS = [
  { value: 'producto_defectuoso', label: 'Producto defectuoso o dañado' },
  { value: 'no_recibido', label: 'No recibí el pedido' },
  { value: 'no_coincide', label: 'No coincide con lo publicado' },
  { value: 'otro', label: 'Otro motivo' },
];

interface Props {
  orderNumber: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReturnRequestModal: React.FC<Props> = ({ orderNumber, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [createReturn, { isLoading, isSuccess, error }] = useCreateReturnRequestMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    await createReturn({ orderNumber, reason, description });
    onSuccess?.();
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">✅</div>
          <p className="font-semibold text-or-navy">Solicitud enviada</p>
          <p className="text-sm text-slate-500">El vendedor y OrigenRed revisarán tu devolución.</p>
          <button onClick={onClose} className="w-full py-2.5 bg-or-navy text-white rounded-xl text-sm font-semibold">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-or-navy">Solicitar devolución</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-or-navy">✕</button>
        </div>
        <p className="text-sm text-slate-500">Pedido {orderNumber}</p>

        {(error as any)?.data?.message && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl">{(error as any).data.message}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label key={r.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                />
                {r.label}
              </label>
            ))}
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles (opcional)"
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={!reason || isLoading}
            className="w-full py-3 bg-or-red text-white font-semibold rounded-xl disabled:opacity-50"
          >
            {isLoading ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </form>
      </div>
    </div>
  );
};
