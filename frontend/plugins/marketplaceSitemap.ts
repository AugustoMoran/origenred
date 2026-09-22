import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const fallbackSitemap = (base: string) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${base}/</loc></url>
<url><loc>${base}/buscar</loc></url>
<url><loc>${base}/vender</loc></url>
<url><loc>${base}/registro</loc></url>
</urlset>`;

/** Escribe dist/sitemap.xml en cada build para que Vercel lo sirva como archivo estático. */
export function marketplaceSitemapPlugin(): Plugin {
  return {
    name: 'marketplace-sitemap',
    apply: 'build',
    async closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist');
      const siteBase = (process.env.FRONTEND_URL || 'https://origenred.com').replace(/\/$/, '');
      const apiBase = (
        process.env.VITE_API_URL || 'https://origenred-ulob.onrender.com/api'
      ).replace(/\/$/, '');

      let xml = fallbackSitemap(siteBase);
      try {
        const res = await fetch(`${apiBase}/marketplace/sitemap.xml`, {
          headers: { Accept: 'application/xml' },
        });
        const text = await res.text();
        if (res.ok && text.trim().startsWith('<?xml')) {
          xml = text;
        }
      } catch (err) {
        console.warn('[sitemap] build fetch failed, using fallback', err);
      }

      fs.mkdirSync(distDir, { recursive: true });
      fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xml, 'utf8');
      console.log('[sitemap] wrote dist/sitemap.xml');
    },
  };
}
