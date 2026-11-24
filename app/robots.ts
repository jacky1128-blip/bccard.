import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '');
  return {
    // /g/ 는 단톡용 모임 방(검색 제외), /s/ 는 공개 결과 페이지(검색 허용)
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/g/'] },
    ...(/^https?:\/\/[^/]+/.test(site) ? { sitemap: `${site}/sitemap.xml` } : {}),
  };
}
