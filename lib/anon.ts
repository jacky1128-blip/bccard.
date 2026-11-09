'use client';
// 가입 없이 쓰는 브라우저별 익명 토큰 (모임 참여·투표 구분용)
const KEY = 'babplan_token';

export function getAnonToken(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
    const t = crypto.randomUUID();
    localStorage.setItem(KEY, t);
    return t;
  } catch {
    // 시크릿 창 등 저장소를 못 쓰면 이번 탭에서만 쓰는 토큰
    const w = window as unknown as { __babplanToken?: string };
    w.__babplanToken ??= crypto.randomUUID();
    return w.__babplanToken;
  }
}
