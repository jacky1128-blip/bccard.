'use client';
// 잇플 상세 링크 (새 탭, GA 이벤트, noreferrer 금지)
import { track } from '@/lib/analytics';
import { btn } from './ui';

const STYLES = {
  primary: btn.mdAccent,      // 카드 안 (코랄)
  soft: btn.smAccentSoft,     // 줄 옆 (연한 코랄)
  text: btn.textAccent,       // 글자 링크
  hero: btn.lgAccentGrad,     // 첫 화면 '1위 맛집 바로 보기' (그라데이션)
};

export default function EatplLink({
  url,
  name,
  variant = 'primary',
  label = '메뉴 보기',
  onOpen,
  source,
}: {
  url: string; // merUrl 그대로. 절대 가공하지 말 것
  name: string;
  variant?: keyof typeof STYLES;
  label?: React.ReactNode;
  onOpen?: () => void; // 메뉴를 열었을 때 (투표 잠금 해제 등)
  source?: string;     // 어느 화면에서 눌렀는지 (GA · 예: "guide:gangnam-hoesik")
}) {
  return (
    <a
      // 데모 데이터는 merUrl이 비어 있어서 '#'. 실제 응답이 오면 merUrl 그대로 열림
      href={url || '#'}
      target="_blank"
      rel="noopener"
      onClick={(e) => {
        if (!url) e.preventDefault();
        track('eatpl_click', source ? { name, source } : { name });
        onOpen?.();
      }}
      className={STYLES[variant]}
    >
      {label}
    </a>
  );
}
