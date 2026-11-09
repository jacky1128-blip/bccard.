// KBO · K리그 경기 일정 (선택 기능, 키 없이 공식 공개 데이터)
// - KBO: koreabaseball.com GetKboGameList (k-skill kbo-results 가 쓰는 것과 같은 엔드포인트)
// - K리그: kleague.com getScheduleList.do (k-skill kleague-results 와 같은 공식 JSON)
// 끝나는 시간은 제공되지 않아 평균 경기 시간으로 추정 → 화면에서 사용자가 고칠 수 있음
import 'server-only';
import { cacheLife } from 'next/cache';
import { addMinutes } from './time';

export type League = 'KBO' | 'K리그1' | 'K리그2';
export type Game = {
  id: string;
  league: League;
  date: string;      // YYYY-MM-DD
  start: string;     // HH:MM
  estEnd: string;    // HH:MM (평균 경기 시간으로 추정)
  home: string;
  away: string;
  venue: string;     // 표시용 구장 이름
  place: string;     // 장소 검색어 (잇플·지도용)
  status: 'scheduled' | 'live' | 'finished' | 'canceled';
};

export const AVG_MINUTES: Record<League, number> = { KBO: 190, K리그1: 115, K리그2: 115 };

// KBO 구장 약칭 → 검색용 이름
const KBO_PARK: Record<string, string> = {
  잠실: '잠실야구장', 고척: '고척스카이돔', 문학: '인천SSG랜더스필드', 수원: '수원KT위즈파크', 대전: '대전한화생명볼파크',
  대구: '대구삼성라이온즈파크', 광주: '광주기아챔피언스필드', 사직: '사직야구장', 창원: '창원NC파크', 포항: '포항야구장',
  울산: '울산문수야구장', 청주: '청주야구장',
};

async function kbo(date: string): Promise<Game[]> {
  const res = await fetch('https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: 'https://www.koreabaseball.com',
      Referer: 'https://www.koreabaseball.com/',
    },
    body: new URLSearchParams({ leId: '1', srId: '0,1,3,4,5,6,7,8,9', date: date.replace(/-/g, '') }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { game?: Record<string, string | number | null>[] };
  return (data.game ?? []).map((g) => {
    const start = String(g.G_TM ?? '18:30');
    const park = String(g.S_NM ?? '');
    const st = String(g.GAME_STATE_SC ?? '1');
    return {
      id: String(g.G_ID),
      league: 'KBO' as const,
      date,
      start,
      estEnd: addMinutes(start, AVG_MINUTES.KBO),
      home: String(g.HOME_NM ?? ''),
      away: String(g.AWAY_NM ?? ''),
      venue: park,
      place: KBO_PARK[park] ?? `${park}야구장`,
      status: st === '2' ? 'live' : st === '3' ? 'finished' : st === '4' ? 'canceled' : 'scheduled',
    };
  });
}

async function kleague(date: string, leagueId: 1 | 2): Promise<Game[]> {
  const [y, m] = date.split('-');
  const res = await fetch('https://www.kleague.com/getScheduleList.do', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Language': 'ko-KR,ko;q=0.9' }, // 없으면 영문 팀명이 옴
    body: JSON.stringify({ leagueId: String(leagueId), year: y, month: m }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { data?: { scheduleList?: Record<string, string | number | null>[] } };
  const league = leagueId === 1 ? ('K리그1' as const) : ('K리그2' as const);
  return (data.data?.scheduleList ?? [])
    .filter((g) => String(g.gameDate).replace(/\./g, '-') === date)
    .map((g) => {
      const start = String(g.gameTime ?? '14:00');
      return {
        id: `${league}-${g.gameId}`,
        league,
        date,
        start,
        estEnd: addMinutes(start, AVG_MINUTES[league]),
        home: String(g.homeTeamName ?? ''),
        away: String(g.awayTeamName ?? ''),
        venue: String(g.fieldName ?? ''),
        place: String(g.fieldNameFull ?? g.fieldName ?? ''),
        status: g.endYn === 'Y' ? 'finished' : 'scheduled',
      };
    });
}

export async function getSchedule(date: string): Promise<Game[]> {
  'use cache';
  cacheLife('hours');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const all = await Promise.all([kbo(date), kleague(date, 1), kleague(date, 2)].map((p) => p.catch(() => [] as Game[])));
  return all.flat().filter((g) => g.status !== 'canceled').sort((a, b) => a.start.localeCompare(b.start));
}
