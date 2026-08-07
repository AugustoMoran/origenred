import { ServiceLeadType } from '../models/ServiceLead';

export const ORIGENRED_SERVICES: Array<{
  type: ServiceLeadType;
  title: string;
  description: string;
}> = [
  {
    type: 'web_design',
    title: 'Crear mi página web',
    description:
      '¿Querés una tienda profesional con tu propio dominio, diseño personalizado y optimizada para vender? Nosotros la desarrollamos para vos.',
  },
  {
    type: 'google_seo',
    title: 'Posicionamiento en Google',
    description: 'Mejorá tu presencia en Google para que más clientes encuentren tu negocio.',
  },
  {
    type: 'meta_ads',
    title: 'Meta Ads',
    description: 'Creamos campañas profesionales para Facebook e Instagram.',
  },
  {
    type: 'google_analytics',
    title: 'Google Analytics',
    description: 'Conocé el comportamiento de tus clientes y tomá mejores decisiones.',
  },
  {
    type: 'seo',
    title: 'SEO',
    description: 'Optimizamos tu sitio para aparecer mejor posicionado en los buscadores.',
  },
];

export const SERVICE_TYPE_LABELS: Record<ServiceLeadType, string> = {
  web_design: 'Diseño web',
  google_seo: 'Posicionamiento en Google',
  meta_ads: 'Meta Ads',
  google_analytics: 'Google Analytics',
  seo: 'SEO',
};
