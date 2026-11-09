// "중간에서 만나요": 각자 출발역 → 다 같이 가기 공평한 역 추천
// 지금은 주요 역 좌표표 + 직선거리로 계산하는 데모.
// TODO(키 필요): 실제 지하철 소요 시간은 경로 API(ODsay 등)가 필요함. k-skill 서울 지하철은 실시간 도착 정보만 있어 소요 시간 계산에 못 씀

export type Station = { name: string; lat: number; lng: number };

// 서울·수도권 주요 역 (대략 좌표)
export const STATIONS: Station[] = [
  ['강남', 37.4979, 127.0276], ['역삼', 37.5007, 127.0365], ['선릉', 37.5045, 127.049], ['삼성', 37.5089, 127.0631],
  ['잠실', 37.5133, 127.1001], ['천호', 37.5386, 127.1237], ['수서', 37.4873, 127.1018], ['건대입구', 37.5404, 127.0692],
  ['성수', 37.5446, 127.0559], ['왕십리', 37.5612, 127.0371], ['청량리', 37.5803, 127.047], ['회기', 37.5897, 127.0579],
  ['신사', 37.5164, 127.0203], ['압구정', 37.527, 127.0284], ['고속터미널', 37.5049, 127.0049], ['교대', 37.4934, 127.014],
  ['사당', 37.4766, 126.9816], ['서울대입구', 37.4812, 126.9527], ['신림', 37.4842, 126.9297], ['구로디지털단지', 37.4852, 126.9015],
  ['신도림', 37.5088, 126.8913], ['영등포', 37.5156, 126.9073], ['여의도', 37.5216, 126.9242], ['노량진', 37.5131, 126.9425],
  ['오목교', 37.5245, 126.8751], ['합정', 37.5495, 126.9139], ['홍대입구', 37.5572, 126.9245], ['신촌', 37.5552, 126.9369],
  ['공덕', 37.5443, 126.9516], ['용산', 37.5299, 126.9648], ['이태원', 37.5345, 126.9946], ['서울역', 37.5547, 126.9707],
  ['시청', 37.5657, 126.9769], ['광화문', 37.571, 126.9768], ['종각', 37.5702, 126.9831], ['을지로입구', 37.566, 126.9822],
  ['동대문역사문화공원', 37.5652, 127.0079], ['혜화', 37.5822, 127.0019], ['성신여대입구', 37.5928, 127.0164], ['수유', 37.638, 127.0257],
  ['노원', 37.6559, 127.0614], ['판교', 37.3948, 127.1112], ['수원', 37.2657, 127.0], ['부평', 37.4894, 126.7249],
].map(([name, lat, lng]) => ({ name: name as string, lat: lat as number, lng: lng as number }));

const norm = (s: string) => s.trim().replace(/\s/g, '').replace(/역$/, '');

export function findStation(input: string): Station | undefined {
  const q = norm(input);
  if (!q) return undefined;
  return STATIONS.find((s) => s.name === q) ?? STATIONS.find((s) => s.name.startsWith(q));
}

// 두 지점 직선거리 (km)
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 직선거리로 대충 잡은 지하철 시간 (평균 시속 약 25km + 갈아타기·걷기 8분). 실제 시간은 지하철 API 연결 후
export const estimateMinutes = (km: number) => (km < 0.3 ? 0 : Math.round(km * 2.4 + 8));

export type MeetingOption = {
  station: Station;
  legs: { from: Station; km: number; min: number }[];
  maxMin: number;  // 가장 오래 걸리는 사람
  gapMin: number;  // 제일 오래 걸리는 사람 - 제일 빨리 오는 사람
};

// 가장 먼 사람의 시간이 가장 짧은 역 순서 (같으면 시간 차이가 작은 순)
export function meetingOptions(origins: Station[], limit = 3): MeetingOption[] {
  if (origins.length < 2) return [];
  return STATIONS.map((station) => {
    const legs = origins.map((from) => {
      const km = distanceKm(from, station);
      return { from, km, min: estimateMinutes(km) };
    });
    const mins = legs.map((l) => l.min);
    return { station, legs, maxMin: Math.max(...mins), gapMin: Math.max(...mins) - Math.min(...mins) };
  })
    .sort((a, b) => a.maxMin - b.maxMin || a.gapMin - b.gapMin)
    .slice(0, limit);
}
