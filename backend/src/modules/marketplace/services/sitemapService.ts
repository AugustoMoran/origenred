import { Listing } from '../models/Listing';
import { SellerProfile } from '../models/SellerProfile';
import { PUBLIC_LISTING_FILTER } from './listingService';

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const urlEntry = (loc: string, lastmod?: Date) => {
  const lastmodTag = lastmod
    ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>`
    : '';
  return `<url><loc>${escapeXml(loc)}</loc>${lastmodTag}</url>`;
};

export const buildMarketplaceSitemap = async () => {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

  const staticPaths = ['/', '/buscar', '/vender', '/registro'];

  const [listings, sellers] = await Promise.all([
    Listing.find(PUBLIC_LISTING_FILTER)
      .select('slug updatedAt')
      .sort({ updatedAt: -1 })
      .limit(2000)
      .lean(),
    SellerProfile.find({ status: 'approved' })
      .select('slug updatedAt')
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean(),
  ]);

  const urls = [
    ...staticPaths.map((path) => urlEntry(`${base}${path}`)),
    ...listings.map((l) => urlEntry(`${base}/p/${l.slug}`, l.updatedAt)),
    ...sellers.map((s) => urlEntry(`${base}/tienda/${s.slug}`, s.updatedAt)),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
};
