import React, { useState } from 'react';
import { useCreateReportMutation } from '../../services/marketplaceApi';

const REASONS = [
  { value: 'producto_falso', label: 'Producto falso o engañoso' },
  { value: 'precio_incorrecto', label: 'Precio incorrecto' },
  { value: 'contenido_inapropiado', label: 'Contenido inapropiado' },
  { value: 'estafa', label: 'Posible estafa' },
  { value: 'otro', label: 'Otro' },
];

interface Props {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
}

export const ReportListingModal: React.FC<Props> = ({ listingId, listingTitle, onClose }) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [createReport, { isLoading, isSuccess, error }] = useCreateReportMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    await createReport({ listingId, reason, description });
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">✅</div>
          <p className="font-semibold text-or-navy">Denuncia enviada</p>
          <p className="text-sm text-slate-500">Un administrador revisará este producto.</p>
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
          <h2 className="font-bold text-or-navy">Denunciar producto</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-or-navy">✕</button>
        </div>
        <p className="text-sm text-slate-500 truncate">{listingTitle}</p>

        {(error as any)?.data?.message && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl">{(error as any).data.message}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-or-navy mb-2">Motivo *</label>
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
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles adicionales (opcional)"
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={!reason || isLoading}
            className="w-full py-3 bg-or-red text-white font-semibold rounded-xl disabled:opacity-50"
          >
            {isLoading ? 'Enviando...' : 'Enviar denuncia'}
          </button>
        </form>
      </div>
    </div>
  );
};
