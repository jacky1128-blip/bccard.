// 역 × 상황 순위 페이지 목록 (검색 유입용) · NEXT_PUBLIC_SITE_URL 기준
import type { MetadataRoute } from 'next';
import { STATIONS, stationLabel } from '@/lib/midpoint';
import { MODE_ORDER } from '@/lib/modes';
import { GUIDES } from '@/lib/guides';
import { dbConfigured } from '@/lib/db';
import { cacheLife } from 'next/cache';
import { listPublicResults } from '@/lib/groups';

// 사이트맵은 1시간마다 새로 (확정 모임이 늘어나는 걸 반영)
async function recentResults() {
  'use cache';
  cacheLife('hours');
  return dbConfigured() ? listPublicResults() : [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '');
  if (!/^https?:\/\/[^/]+/.test(site)) return [];
  // 확정된 모임 결과 공개 페이지 (DB 있을 때만)
  const results = await recentResults();
  return [
    { url: `${site}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${site}/ranking`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${site}/guide`, changeFrequency: 'weekly', priority: 0.8 },
    ...GUIDES.map((g) => ({ url: `${site}/guide/${g.slug}`, changeFrequency: 'daily' as const, priority: 0.8 })),
    { url: `${site}/faq`, changeFrequency: 'monthly', priority: 0.7 },
    ...results.map((r) => ({ url: `${site}/s/${r.id}`, lastModified: new Date(r.created_at), changeFrequency: 'yearly' as const, priority: 0.4 })),
    ...STATIONS.flatMap((s) =>
      MODE_ORDER.filter((m) => m !== 'travel').map((m) => ({
        url: `${site}/r/${encodeURIComponent(stationLabel(s.name))}/${m}`,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ),
  ];
}
