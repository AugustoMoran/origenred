import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

const SITE_NAME = import.meta.env.VITE_COMPANY_NAME || 'OrigenRed';
const DEFAULT_DESCRIPTION =
  import.meta.env.VITE_SITE_DESCRIPTION ||
  'Marketplace argentino para comprar y vender productos con envíos y Mercado Pago.';

const setMeta = (name: string, content: string, property = false) => {
  const attr = property ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

export const SEO = ({ title, description, image, url, type = 'website' }: SEOProps) => {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    const desc = description || DEFAULT_DESCRIPTION;
    const pageUrl = url || window.location.href;
    const imageUrl = image || `${window.location.origin}/origenred-logo.png`;

    setMeta('description', desc);
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', desc, true);
    setMeta('og:type', type, true);
    setMeta('og:url', pageUrl, true);
    setMeta('og:image', imageUrl, true);
    setMeta('og:site_name', SITE_NAME, true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', desc);
    setMeta('twitter:image', imageUrl);

    const gsc = import.meta.env.VITE_GSC_VERIFICATION;
    if (gsc) setMeta('google-site-verification', gsc);
  }, [title, description, image, url, type]);

  return null;
};
