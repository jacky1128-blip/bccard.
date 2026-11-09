import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '');
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/g/'] },
    ...(/^https?:\/\/[^/]+/.test(site) ? { sitemap: `${site}/sitemap.xml` } : {}),
  };
}
