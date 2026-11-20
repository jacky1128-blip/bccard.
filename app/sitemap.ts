// 역 × 상황 순위 페이지 목록 (검색 유입용) · NEXT_PUBLIC_SITE_URL 기준
import type { MetadataRoute } from 'next';
import { STATIONS, stationLabel } from '@/lib/midpoint';
import { MODE_ORDER } from '@/lib/modes';
import { GUIDES } from '@/lib/guides';

export default function sitemap(): MetadataRoute.Sitemap {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '');
  if (!/^https?:\/\/[^/]+/.test(site)) return [];
  return [
    { url: `${site}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${site}/ranking`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${site}/guide`, changeFrequency: 'weekly', priority: 0.8 },
    ...GUIDES.map((g) => ({ url: `${site}/guide/${g.slug}`, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...STATIONS.flatMap((s) =>
      MODE_ORDER.filter((m) => m !== 'travel').map((m) => ({
        url: `${site}/r/${encodeURIComponent(stationLabel(s.name))}/${m}`,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ),
  ];
}
