// 모임 저장: 만들기 · 조회 · 참여 · 투표 · 확정 · (중간에서 만나요) 장소 바꾸기
// 모든 읽기·쓰기는 서버에서 Postgres 로 직접 (lib/db.ts). 참여자는 브라우저별 익명 토큰으로 구분
import 'server-only';
import { randomBytes } from 'node:crypto';
import type { EatplItem } from '@/types/eatpl';
import type { GroupState, GroupStatus, Mode } from '@/types/group';
import { sql, tx, type Query } from './db';
import { getCandidates } from './stores';
import { MODES, toMode } from './modes';
import { voteThreshold } from './rules';
import { dayOfDate, toMinutes } from './time';
import { toView } from './view';
import { CANT_RULES } from './recommend';

export class GroupError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type GroupRow = {
  id: string; mode: string; title: string; place_text: string; place_region: string | null;
  meet_date: string | null; meet_time: string | null; when_label: string | null; memo: string | null;
  mid: boolean; headcount: number; status: GroupStatus; confirmed_mer_key: string | null;
};
type ParticipantRow = { id: string; anon_token: string; nickname: string | null; is_host: boolean; origin: string | null; cant_eat: string[] | null };
type CandidateRow = { mer_key: string; rank: number; eatpl: EatplItem; ai_reason: string | null; reason_by: string | null };
type VoteRow = { participant_id: string; mer_key: string };

const newId = () => {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789'; // 헷갈리는 글자(l, o, 0, 1) 제외
  return [...randomBytes(6)].map((b) => abc[b % abc.length]).join('');
};

export const cleanToken = (v: unknown) => (typeof v === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(v) ? v : null);
const cleanText = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const cleanCant = (v: unknown) => (Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string' && c in CANT_RULES) : []);

// 2026-11-14 + 19:00 → 11/14(금) 19:00
export function formatWhen(date?: string | null, time?: string | null) {
  if (!date) return time ?? '';
  const [, m, d] = date.split('-').map(Number);
  const dow = dayOfDate(date);
  return `${m}/${d}${dow ? `(${dow})` : ''}${time ? ` ${time}` : ''}`;
}

// 후보 3곳 찾기 (모임 시간·요일·못 먹는 거 반영) → candidates 행
async function findCandidates(g: { mode: Mode; place: string; date?: string | null; time?: string | null; headcount: number; cantEat?: string[]; when: string }) {
  const r = await getCandidates({
    place: g.place,
    mode: g.mode,
    at: toMinutes(g.time ?? undefined) ?? undefined,
    day: dayOfDate(g.date ?? undefined),
    cantEat: g.cantEat,
    limit: 3,
    maxWalk: 20,
    when: g.when,
    headcount: g.headcount,
  });
  if (!r.live || !r.items?.length) throw new GroupError(502, r.error ? `후보를 찾지 못했어요 (${r.error})` : '그 장소·시간에 맞는 후보가 없어요');
  return {
    label: r.label,
    region: r.region ?? null,
    center: r.center,
    rows: r.items.map((it, i) => ({ mer_key: it.merUrl, rank: i + 1, eatpl: it, ai_reason: it._reason ?? null, reason_by: it._reasonBy ?? null })),
  };
}

export async function createGroup(body: Record<string, unknown>) {
  const token = cleanToken(body.token);
  if (!token) throw new GroupError(400, '토큰이 없어요');
  const mode = toMode(body.mode, 'party');
  const place = cleanText(body.place, 60);
  if (!place) throw new GroupError(400, '장소를 넣어 주세요');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date ?? '')) ? String(body.date) : null;
  const time = toMinutes(String(body.time ?? '')) != null ? cleanText(body.time, 5) : null;
  const headcount = Math.max(2, Math.min(12, Number(body.headcount) || MODES[mode].defaultHeadcount));
  const title = cleanText(body.title, 40) || MODES[mode].event;
  const when = formatWhen(date, time);
  const found = await findCandidates({ mode, place, date, time, headcount, when });

  // 모임 · 후보 · 방장을 한 번에 저장 (중간에 실패하면 전부 취소)
  return tx(async (q) => {
    let id = '';
    for (let i = 0; i < 5 && !id; i++) {
      const rows = await q<{ id: string }>(
        `insert into groups (id, mode, title, place_text, place_region, place_lat, place_lng, meet_date, meet_time, when_label, memo, mid, headcount, status)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'waiting')
         on conflict (id) do nothing returning id`, // ID가 겹치면 새 ID로 다시
        [newId(), mode, title, found.label, found.region, found.center?.lat ?? null, found.center?.lng ?? null,
          date, time, when, cleanText(body.memo, 40) || null, body.mid === true, headcount],
      );
      id = rows[0]?.id ?? '';
    }
    if (!id) throw new GroupError(500, '모임 ID를 만들지 못했어요');
    await insertCandidates(q, id, found.rows);
    await q(
      `insert into participants (group_id, anon_token, nickname, is_host, cant_eat, origin) values ($1, $2, $3, true, $4, $5)`,
      [id, token, cleanText(body.nickname, 12) || '방장', cleanCant(body.cantEat), cleanText(body.origin, 30) || null],
    );
    return id;
  });
}

type CandidateInsert = Awaited<ReturnType<typeof findCandidates>>['rows'];

// 후보 여러 건을 한 문장으로
const insertCandidates = (q: Query, id: string, rows: CandidateInsert) =>
  q(
    `insert into candidates (group_id, mer_key, rank, eatpl, ai_reason, reason_by)
     select $1, x.mer_key, x.rank, x.eatpl, x.ai_reason, x.reason_by
     from jsonb_to_recordset($2::jsonb) as x(mer_key text, rank int, eatpl jsonb, ai_reason text, reason_by text)`,
    [id, JSON.stringify(rows)],
  );

// 모임 하나를 한 번에 읽음 (4초마다 새로고침하므로 왕복 1번으로)
async function load(id: string) {
  const rows = await sql<{ group: GroupRow; participants: ParticipantRow[]; candidates: CandidateRow[]; votes: VoteRow[] }>(
    `select to_jsonb(g) as group,
       coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'anon_token', p.anon_token, 'nickname', p.nickname,
         'is_host', p.is_host, 'origin', p.origin, 'cant_eat', p.cant_eat) order by p.joined_at)
         from participants p where p.group_id = g.id), '[]') as participants,
       coalesce((select jsonb_agg(jsonb_build_object('mer_key', c.mer_key, 'rank', c.rank, 'eatpl', c.eatpl,
         'ai_reason', c.ai_reason, 'reason_by', c.reason_by) order by c.rank)
         from candidates c where c.group_id = g.id), '[]') as candidates,
       coalesce((select jsonb_agg(jsonb_build_object('participant_id', v.participant_id, 'mer_key', v.mer_key))
         from votes v where v.group_id = g.id), '[]') as votes
     from groups g where g.id = $1`,
    [id],
  );
  if (!rows[0]) throw new GroupError(404, '모임을 찾지 못했어요');
  return rows[0];
}

function toState(x: Awaited<ReturnType<typeof load>>, token: string | null): GroupState {
  const { group: g, participants, candidates, votes } = x;
  const me = token ? participants.find((p) => p.anon_token === token) : undefined;
  const tally: Record<string, number> = {};
  for (const v of votes) tally[v.mer_key] = (tally[v.mer_key] ?? 0) + 1;
  const mode = toMode(g.mode, 'party');
  return {
    id: g.id,
    mode,
    title: g.title,
    place: g.place_text,
    when: g.when_label ?? '',
    memo: g.memo ?? undefined,
    mid: g.mid,
    headcount: g.headcount,
    status: g.status,
    need: voteThreshold(g.headcount),
    participants: participants.map((p) => ({ name: p.is_host ? '방' : (p.nickname || '친구').slice(0, 1), origin: p.origin ?? undefined, isHost: p.is_host })),
    stores: candidates.map((c, i) => ({
      ...toView({ ...c.eatpl, _reason: c.ai_reason ?? c.eatpl._reason, _reasonBy: (c.reason_by as 'ai' | 'rule' | null) ?? c.eatpl._reasonBy }, i),
      key: c.mer_key,
    })),
    votes: tally,
    totalVotes: votes.length,
    confirmedKey: g.confirmed_mer_key ?? undefined,
    me: { joined: !!me, isHost: !!me?.is_host, vote: me ? votes.find((v) => v.participant_id === me.id)?.mer_key : undefined },
  };
}

export async function getGroupState(id: string, token: string | null) {
  return toState(await load(id), token);
}

// 공개 정보만 (서버 렌더링·공유 미리보기용, 토큰 없이)
export async function getGroupPublic(id: string) {
  try {
    return toState(await load(id), null);
  } catch (e) {
    if (e instanceof GroupError && e.status === 404) return null;
    throw e;
  }
}

export async function joinGroup(id: string, body: Record<string, unknown>) {
  const token = cleanToken(body.token);
  if (!token) throw new GroupError(400, '토큰이 없어요');
  const x = await load(id);
  if (x.group.status === 'confirmed') throw new GroupError(409, '이미 확정된 모임이에요');
  if (!x.participants.some((p) => p.anon_token === token)) {
    if (x.participants.length >= x.group.headcount) throw new GroupError(409, '자리가 다 찼어요');
    await sql(
      `insert into participants (group_id, anon_token, nickname, cant_eat, origin) values ($1, $2, $3, $4, $5)
       on conflict (group_id, anon_token) do nothing`, // 같은 브라우저로 두 번 눌러도 한 명
      [id, token, cleanText(body.nickname, 12) || null, cleanCant(body.cantEat), cleanText(body.origin, 30) || null],
    );
  } else if (body.origin !== undefined || body.cantEat !== undefined) {
    await sql(`update participants set origin = $3, cant_eat = $4 where group_id = $1 and anon_token = $2`,
      [id, token, cleanText(body.origin, 30) || null, cleanCant(body.cantEat)]);
  }
  // 절반(2명이면 둘 다) 차면 투표 시작. 중간에서 만나요는 방장이 중간역을 정한 뒤 직접 시작
  if (!x.group.mid) await sql(
    `update groups set status = 'voting'
     where id = $1 and status = 'waiting' and (select count(*) from participants where group_id = $1) >= $2`,
    [id, voteThreshold(x.group.headcount)],
  );
  return getGroupState(id, token);
}

export async function voteGroup(id: string, body: Record<string, unknown>) {
  const token = cleanToken(body.token);
  const merKey = cleanText(body.merKey, 300);
  if (!token || !merKey) throw new GroupError(400, '투표 정보가 없어요');
  const x = await load(id);
  if (x.group.status !== 'voting') throw new GroupError(409, x.group.status === 'confirmed' ? '이미 확정됐어요' : '아직 투표 전이에요');
  const me = x.participants.find((p) => p.anon_token === token);
  if (!me) throw new GroupError(403, '먼저 참여해 주세요');
  if (!x.candidates.some((c) => c.mer_key === merKey)) throw new GroupError(400, '후보에 없는 가게예요');
  await sql(
    `insert into votes (group_id, participant_id, mer_key) values ($1, $2, $3)
     on conflict (group_id, participant_id) do update set mer_key = excluded.mer_key, voted_at = now()`,
    [id, me.id, merKey],
  );
  return getGroupState(id, token);
}

// 방장 확정: 고른 가게(없으면 최다 득표)로. 투표 전이라도 방장은 지금 인원으로 시작·확정 가능
export async function confirmGroup(id: string, body: Record<string, unknown>) {
  const token = cleanToken(body.token);
  const x = await load(id);
  const me = x.participants.find((p) => p.anon_token === token);
  if (!me?.is_host) throw new GroupError(403, '방장만 할 수 있어요');
  if (body.startVote === true) {
    await sql(`update groups set status = 'voting' where id = $1 and status = 'waiting'`, [id]);
    return getGroupState(id, token);
  }
  const tally = new Map<string, number>();
  for (const v of x.votes) tally.set(v.mer_key, (tally.get(v.mer_key) ?? 0) + 1);
  const pick = cleanText(body.merKey, 300) || [...x.candidates].sort((a, b) => (tally.get(b.mer_key) ?? 0) - (tally.get(a.mer_key) ?? 0) || a.rank - b.rank)[0]?.mer_key;
  if (!pick || !x.candidates.some((c) => c.mer_key === pick)) throw new GroupError(400, '확정할 가게가 없어요');
  await sql(`update groups set status = 'confirmed', confirmed_mer_key = $2 where id = $1`, [id, pick]);
  return getGroupState(id, token);
}

// 중간에서 만나요: 방장이 다들 출발역 기준으로 고른 역으로 후보 다시 찾기 (투표 전만)
export async function changePlace(id: string, body: Record<string, unknown>) {
  const token = cleanToken(body.token);
  const place = cleanText(body.place, 60);
  const x = await load(id);
  const me = x.participants.find((p) => p.anon_token === token);
  if (!me?.is_host) throw new GroupError(403, '방장만 할 수 있어요');
  if (x.group.status !== 'waiting') throw new GroupError(409, '투표가 시작되면 장소를 바꿀 수 없어요');
  if (!place) throw new GroupError(400, '장소를 넣어 주세요');
  const cantEat = [...new Set(x.participants.flatMap((p) => p.cant_eat ?? []))];
  const found = await findCandidates({
    mode: toMode(x.group.mode, 'party'), place, date: x.group.meet_date, time: x.group.meet_time,
    headcount: x.group.headcount, cantEat, when: x.group.when_label ?? '',
  });
  await tx(async (q) => {
    // 후보를 찾는 사이 투표가 시작됐으면 바꾸지 않음
    const moved = await q(
      `update groups set place_text = $2, place_region = $3, place_lat = $4, place_lng = $5
       where id = $1 and status = 'waiting' returning id`,
      [id, found.label, found.region, found.center?.lat ?? null, found.center?.lng ?? null],
    );
    if (!moved.length) throw new GroupError(409, '투표가 시작되면 장소를 바꿀 수 없어요');
    await q(`delete from votes where group_id = $1`, [id]);
    await q(`delete from candidates where group_id = $1`, [id]);
    await insertCandidates(q, id, found.rows);
  });
  return getGroupState(id, token);
}

