// 가게 목록을 규칙 이유로 바로 보여 주고, AI 추천 이유가 준비되면 그걸로 바꿔 그림 (서버 컴포넌트)
// AI 문장 생성에 몇 초 걸려서 그동안 빈 화면이 되던 문제 (2026-11-10)
import { Suspense, type ReactNode } from 'react';
import { withAiReasons, type StoresResult } from '@/lib/stores';
import type { StoreView } from '@/lib/view';
import type { Mode } from '@/types/group';

type Q = { mode: Mode; when?: string; cantEat?: string[]; headcount?: number };
type Props = { r: StoresResult; q: Q; render: (stores: StoreView[]) => ReactNode };

async function Later({ r, q, render }: Props) {
  return render(await withAiReasons(r, q));
}

export default function WithAiReasons(props: Props) {
  return (
    <Suspense fallback={props.render(props.r.stores)}>
      <Later {...props} />
    </Suspense>
  );
}
