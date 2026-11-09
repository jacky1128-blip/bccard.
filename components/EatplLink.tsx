'use client';
// 잇플 상세 링크 (새 탭, GA 이벤트, noreferrer 금지)
import { track } from '@/lib/analytics';
import { btn } from './ui';

const STYLES = {
  primary: btn.mdPrimary,  // 카드 안
  soft: btn.smSoft,        // 줄 옆
  text: btn.textLink,      // 글자 링크
};

export default function EatplLink({
  url,
  name,
  variant = 'primary',
  label = '메뉴 보기',
}: {
  url: string; // merUrl 그대로. 절대 가공하지 말 것
  name: string;
  variant?: keyof typeof STYLES;
  label?: string;
}) {
  return (
    <a
      // 데모 데이터는 merUrl이 비어 있어서 '#'. 실제 응답이 오면 merUrl 그대로 열림
      href={url || '#'}
      target="_blank"
      rel="noopener"
      onClick={(e) => {
        if (!url) e.preventDefault();
        track('eatpl_click', { name });
      }}
      className={STYLES[variant]}
    >
      {label}
    </a>
  );
}
