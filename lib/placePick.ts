// 장소 검색 결과에서 "기준 장소"로 쓸 것 고르기 (네이버·카카오 공통)
// 검색어가 일반 단어("고양이")거나 가게 이름 일부면 결과 1등이 아무 가게(명동 고양이카페 등)라서,
// 1) 이름이 정확히 같은 곳 → 2) 역·경기장·명소·학교·공원 같은 '장소' 분류 → 없으면 못 찾음으로 처리
export type Candidate = { title: string; category?: string; address?: string };

// 기준점으로 쓸 만한 장소 분류 (네이버 "스포츠,오락>프로야구장", 카카오 "스포츠,레저 > 야구 > 야구장" 등)
const PLACE_CATEGORY =
  /지하철|전철|기차|철도|터미널|공항|여행|명소|관광|야구장|종합운동장|운동장|경기장|축구장|체육관|공연장|공연|전시|문화시설|미술관|박물관|교육,학문|대학교|학교|공원|공공|관공서|구청|시청|행정|주민센터|랜드마크|아파트|주거|빌딩|지명|광장|시장|쇼핑몰|백화점|복합/;

const norm = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s/g, '').toLowerCase();

export function pickPlace<T extends Candidate>(query: string, items: T[]): T | undefined {
  const q = norm(query);
  const exact = items.find((x) => norm(x.title) === q);
  if (exact) return exact;
  if (/역$/.test(query)) {
    const st = items.find((x) => /지하철|전철|기차|철도/.test(x.category ?? ''));
    if (st) return st;
  }
  // "○○동" → 주소에 그 동이 들어 있는 결과 (이름만 비슷한 다른 동네 가게 제외)
  if (/(동|읍|면|가|리)$/.test(query)) {
    const dong = query.trim().split(/\s+/).pop()!;
    const hit = items.find((x) => (x.address ?? '').split(/\s+/).some((w) => w === dong || w.replace(/\d+(동|가)$/, '$1') === dong));
    if (hit) return hit;
  }
  return items.find((x) => PLACE_CATEGORY.test(x.category ?? ''));
}
