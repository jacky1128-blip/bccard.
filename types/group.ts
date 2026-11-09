import type { StoreView } from '@/lib/view';

export type Mode = 'meal' | 'party' | 'event' | 'travel';
export type GroupStatus = 'waiting' | 'voting' | 'confirmed';

// 모임 화면이 받는 상태 (GET /api/groups/[id]?token= · 모든 POST 응답)
export type GroupState = {
  id: string;
  mode: Mode;
  title: string;
  place: string;
  when: string;
  memo?: string;
  mid: boolean;
  headcount: number;
  status: GroupStatus;
  need: number;                    // 투표가 열리는 인원
  participants: { name: string; origin?: string; isHost: boolean }[];
  stores: StoreView[];
  votes: Record<string, number>;   // mer_key → 표 수
  totalVotes: number;
  confirmedKey?: string;
  me: { joined: boolean; isHost: boolean; vote?: string };
};
