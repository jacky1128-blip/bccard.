// PWA: 홈 화면에 추가하면 주소창 없이 앱처럼 열림 (서비스 워커 없음 · 순위는 매번 새 데이터라 캐시하지 않음)
// 아이폰 홈 화면 아이콘은 app/apple-icon.png (180px), 이름·상태 표시줄은 layout.tsx 의 appleWebApp
import type { MetadataRoute } from 'next';
import { SERVICE_NAME, SERVICE_TAGLINE } from '@/components/ui';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SERVICE_NAME} · ${SERVICE_TAGLINE}`,
    short_name: SERVICE_NAME,
    description: 'BC카드 eat.pl 잇플 결제 데이터로 지금 갈 만한 곳을 찾고, 친구들과 같이 정해요.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'ko',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      // 파란 바탕이 꽉 찬 아이콘이고 그림이 안쪽 80% 안에 있어서 maskable(안드로이드 모양 맞춤)로도 씀
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
