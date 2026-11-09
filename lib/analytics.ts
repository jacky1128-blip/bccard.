// GA4 이벤트
export function track(event: 'eatpl_click' | 'create_group' | 'join_group' | 'vote' | 'share_link', params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.('event', event, params);
}
