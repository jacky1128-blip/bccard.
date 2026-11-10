// 예매한 열차(KTX/SRT) → 정차역별 시각 (서버에서만 호출)
// 코레일이 공개하는 KTX 통합 시간표(엑셀, 로그인 없음)를 읽음. k-skill railway-timetable 과 같은 출처·같은 읽는 방식
//  - 예매 내역 자체는 코레일·SR 로그인이 필요해서 못 가져옴 → "열차번호 + 날짜"로 시간표에서 찾기
//  - 수서발(SRT) 열차도 같은 파일에 들어 있음
//  - 계획 시간표라 실시간 지연·운휴는 반영 안 됨. 못 찾으면 사용자가 도착역·시간을 직접 입력 (TravelForm)
import 'server-only';
import { cacheLife } from 'next/cache';
import readXlsxFile, { readSheetNames } from 'read-excel-file/node';

export type TrainType = 'KTX' | 'SRT';
export type TrainStop = { name: string; time: string };
export type TrainInfo = {
  type: string;        // 시간표의 편성 이름 (KTX, KTX-산천, KTX-이음 …)
  no: string;
  date: string;
  stops: TrainStop[];  // 정차역 순서대로
  from: string;        // 첫 정차역
  to: string;          // 기본은 종착역 (화면에서 내릴 역을 바꿀 수 있음)
  depart: string;
  arrive: string;
  source: string;      // 시간표 이름 "KTX 시간표(2026. 11. 1. 기준)"
  demo: boolean;
};

const BOARD_URL = 'https://www.korail.com/com/userBoard.do?schBcid=ticketTable&mode=list&page=1&schStr=KTX&bdCode=&Device=BH&Version=999999999';
const FILE_BASE = 'https://www.korail.com/file/cubedata/COMMON/';
const UA = 'babkok/timetable-readonly (+https://babkok.vercel.app)';
const TITLE = /(?:KTX|경부선|호남선|전라선|경전선|동해선|강릉선|중앙선|중부내륙선).*(?:시간표|시각표)/;
const EFFECTIVE = /(20\d{2})[.\s년]+(\d{1,2})[.\s월]+(\d{1,2})/;

type Source = { title: string; url: string; effective: string };

// 그 날짜에 적용되는 시간표 (기준일이 그 날짜 이하인 것 중 가장 최근)
async function sourceFor(date: string): Promise<Source | null> {
  'use cache';
  cacheLife('days');
  const res = await fetch(BOARD_URL, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`코레일 시간표 목록 ${res.status}`);
  const j = (await res.json()) as { boardList?: { bdTitle?: string; regdt?: string; fileId?: string[] }[] };
  const all = (j.boardList ?? [])
    .map((b) => {
      const title = String(b.bdTitle ?? '').trim();
      const file = String(b.fileId?.[0] ?? '').replace(/^\/+/, '');
      const m = title.match(EFFECTIVE);
      const effective = m ? `${m[1]}${m[2].padStart(2, '0')}${m[3].padStart(2, '0')}` : String(b.regdt ?? '').replace(/-/g, '');
      return { title, url: FILE_BASE + file, effective, ok: TITLE.test(title) && /\.xlsx$/i.test(file) };
    })
    .filter((s) => s.ok);
  const ymd = date.replace(/-/g, '');
  const usable = all.filter((s) => s.effective <= ymd);
  const pick = (usable.length ? usable : all).sort((a, b) => b.effective.localeCompare(a.effective))[0];
  return pick ? { title: pick.title, url: pick.url, effective: pick.effective } : null;
}

type Row = { no: string; type: string; note: string; stops: TrainStop[] };

const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, '').replace(/역$/, '');
// 엑셀 시각은 하루를 1로 본 소수 (0.2173… = 05:13). 0 이면 그 역에 안 섬
function toTime(v: unknown): string | null {
  if (typeof v === 'number' && v > 0 && v < 1.5) {
    const m = Math.round(v * 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }
  if (typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v.trim())) return v.trim().padStart(5, '0');
  return null;
}

// 시간표 파일 → 열차번호별 정차역·시각 (하루 캐시 · 파일 대신 읽은 결과만 저장)
async function loadTimetable(url: string): Promise<Record<string, Row[]>> {
  'use cache';
  cacheLife('days');
  const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://www.korail.com/ticket/search' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`코레일 시간표 파일 ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const byNo: Record<string, Row[]> = {};
  for (const sheet of await readSheetNames(buf)) {
    const rows = (await readXlsxFile(buf, { sheet })) as unknown[][];
    // 한 줄에 상행·하행 표가 나란히 있어서 '열차번호' 칸마다 구간을 나눔
    let sections: { start: number; end: number; stations: [number, string][]; type: number; note: number }[] = [];
    for (const row of rows) {
      const cells = row.map(norm);
      if (cells.includes('열차번호')) {
        const starts = cells.flatMap((c, i) => (c === '열차번호' ? [i] : []));
        sections = starts.map((start, k) => {
          const end = starts[k + 1] ?? cells.length;
          const type = cells.indexOf('편성', start);
          const note = cells.indexOf('비고', start);
          const stations: [number, string][] = [];
          for (let i = start + 1; i < (note > start && note < end ? note : end); i++) {
            if (i !== type && cells[i] && /^[가-힣()]+$/.test(cells[i])) stations.push([i, cells[i]]);
          }
          return { start, end, stations, type: type < end ? type : -1, note: note < end ? note : -1 };
        });
        continue;
      }
      for (const s of sections) {
        const no = String(row[s.start] ?? '').trim();
        if (!/^\d{1,4}$/.test(no)) continue;
        const stops = s.stations.flatMap(([i, name]) => {
          const time = toTime(row[i]);
          return time ? [{ name, time }] : [];
        });
        if (stops.length < 2) continue;
        (byNo[no] ??= []).push({ no, type: s.type >= 0 ? String(row[s.type] ?? 'KTX').trim() : 'KTX', note: s.note >= 0 ? String(row[s.note] ?? '') : '', stops });
      }
    }
  }
  return byNo;
}

const DAYS = '일월화수목금토';
// 비고 "매일", "평일", "토일", "금" … 그 날짜에 다니는지
function runsOn(note: string, date: string) {
  const text = note.replace(/\s+/g, '');
  if (!text || text.includes('매일')) return true;
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return true;
  const dow = DAYS[d.getUTCDay()];
  if (text === '평일') return !'토일'.includes(dow);
  const compact = text.replace(/[,./·~-]/g, '');
  if (/^[월화수목금토일]+$/.test(compact)) return compact.includes(dow);
  return true;
}

export async function lookupTrain(_type: TrainType, no: string, date: string): Promise<TrainInfo | null> {
  const n = String(Number(no.replace(/\D/g, '')));
  if (n === '0' || n === 'NaN') return null;
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;
  const src = await sourceFor(day);
  if (!src) throw new Error('코레일 시간표를 찾지 못했어요');
  const rows = (await loadTimetable(src.url))[n] ?? [];
  // 같은 번호가 요일별로 여러 줄이면 그 날짜에 다니는 줄, 없으면 첫 줄. 정차역이 가장 많은 줄(전 구간)을 우선
  const row = [...rows].sort((a, b) => Number(runsOn(b.note, day)) - Number(runsOn(a.note, day)) || b.stops.length - a.stops.length)[0];
  if (!row) return null;
  const first = row.stops[0];
  const last = row.stops[row.stops.length - 1];
  return {
    type: row.type || 'KTX',
    no: n,
    date: day,
    stops: row.stops.map((s) => ({ ...s, name: `${s.name}역` })),
    from: `${first.name}역`,
    to: `${last.name}역`,
    depart: first.time,
    arrive: last.time,
    source: src.title,
    demo: false,
  };
}
