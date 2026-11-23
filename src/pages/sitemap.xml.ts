import type { APIRoute } from 'astro';
import { getRoutes } from '../lib/routes';
import { absolute } from '../lib/data';

// /sitemap.xml - every public page with absolute https://uxagencyfinders.com URLs.
export const GET: APIRoute = () => {
  const urls = getRoutes()
    .map((r) => `  <url>\n    <loc>${absolute(r.path)}</loc>\n    <lastmod>${r.lastmod}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority.toFixed(1)}</priority>\n  </url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

