import React, { useState } from 'react';
import {
  useCreateServiceLeadMutation,
  useGetSellerServicesQuery,
} from '../../../services/marketplaceApi';

const STATUS_LABELS: Record<string, string> = {
  new: 'En revisión',
  contacted: 'Contactado',
  closed: 'Cerrado',
};

export const SellerServicesPage: React.FC = () => {
  const { data, isLoading, refetch } = useGetSellerServicesQuery();
  const [createLead, { isLoading: submitting }] = useCreateServiceLeadMutation();
  const [message, setMessage] = useState('');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const services = data?.services || [];
  const leads = (data?.leads || []) as Array<{ serviceType: string; status: string }>;
  const labels = data?.labels || {};

  const leadByType = new Map(leads.map((l) => [l.serviceType, l]));

  const handleRequest = async (serviceType: string) => {
    setFeedback(null);
    try {
      await createLead({ serviceType, message: message.trim() || undefined }).unwrap();
      setFeedback('Solicitud enviada. Te contactaremos pronto.');
      setActiveType(null);
      setMessage('');
      refetch();
    } catch (err: any) {
      setFeedback(err?.data?.message || 'No se pudo enviar la solicitud');
    }
  };

  if (isLoading) {
    return <p className="text-slate-500">Cargando servicios...</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-or-navy">Servicios de OrigenRed</h2>
        <p className="text-sm text-slate-500 mt-1">
          Herramientas profesionales para hacer crecer tu negocio. Sin spam — solo cuando vos lo necesites.
        </p>
      </div>

      {feedback && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3 rounded-xl">
          {feedback}
        </div>
      )}

      <div className="space-y-4">
        {services.map((service) => {
          const existing = leadByType.get(service.type);
          const isOpen = activeType === service.type;

          return (
            <div
              key={service.type}
              className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3"
            >
              <h3 className="font-semibold text-or-navy">{service.title}</h3>
              <p className="text-sm text-slate-600">{service.description}</p>

              {existing && existing.status !== 'closed' ? (
                <span className="text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                  {STATUS_LABELS[existing.status] || existing.status}
                </span>
              ) : isOpen ? (
                <div className="space-y-3 pt-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="¿Qué necesitás? (opcional)"
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRequest(service.type)}
                      className="px-4 py-2 bg-or-red text-white text-sm font-semibold rounded-xl disabled:opacity-60"
                    >
                      Enviar solicitud
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveType(null);
                        setMessage('');
                      }}
                      className="px-4 py-2 text-sm text-slate-500"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveType(service.type)}
                  className="px-4 py-2 bg-or-navy text-white text-sm font-semibold rounded-xl"
                >
                  Solicitar asesoramiento
                </button>
              )}
            </div>
          );
        })}
      </div>

      {leads.length > 0 && (
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Mis solicitudes</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            {(leads as any[]).map((lead) => (
              <li key={lead._id} className="flex justify-between gap-4">
                <span>{labels[lead.serviceType] || lead.serviceType}</span>
                <span className="text-slate-400">{STATUS_LABELS[lead.status] || lead.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
