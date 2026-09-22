const siteBase = () => {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  return 'https://origenred.com';
};

const apiSitemapUrl = () => {
  const apiBase =
    process.env.VITE_API_URL ||
    process.env.API_URL ||
    'https://origenred-ulob.onrender.com/api';
  return `${apiBase.replace(/\/$/, '')}/marketplace/sitemap.xml`;
};

const fallbackXml = () => {
  const base = siteBase();
  const paths = ['/', '/buscar', '/vender', '/registro'];
  const urls = paths.map((p) => `<url><loc>${base}${p}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
};

export default async function handler(_req, res) {
  try {
    const upstream = await fetch(apiSitemapUrl(), {
      headers: { Accept: 'application/xml' },
    });
    const body = await upstream.text();
    if (upstream.ok && body.trim().startsWith('<?xml')) {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(body);
    }
  } catch (err) {
    console.error('[sitemap] upstream failed', err);
  }

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600');
  return res.status(200).send(fallbackXml());
}
