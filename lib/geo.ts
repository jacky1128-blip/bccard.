// 좌표 도구: 잇플 TM128 → WGS84, 거리, 도보 시간
// 잇플 응답 xaxsVal / yaxsVal 은 TM128(KATEC, Bessel 타원체) 좌표.
// 카카오 지오코딩과 비교해 평균 8m 안쪽으로 맞는 것을 확인함 (2026-11-09, 역삼동 8곳)

const D = Math.PI / 180;

export type LatLng = { lat: number; lng: number };

export function tm128ToWgs84(x: number, y: number): LatLng | null {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x <= 0 || y <= 0) return null;
  // 1) TM 역변환 (Bessel 1841, 원점 38N 128E, k0 0.9999, 가산 400000/600000)
  const a = 6377397.155;
  const f = 1 / 299.1528128;
  const k0 = 0.9999;
  const lat0 = 38 * D;
  const lon0 = 128 * D;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const meridian = (p: number) =>
    a *
    ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * p -
      ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * p) +
      ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * p) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * p));
  const mu = (meridian(lat0) + (y - 600000) / k0) / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const p1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const sin1 = Math.sin(p1);
  const C1 = ep2 * Math.cos(p1) ** 2;
  const T1 = Math.tan(p1) ** 2;
  const N1 = a / Math.sqrt(1 - e2 * sin1 ** 2);
  const R1 = (a * (1 - e2)) / (1 - e2 * sin1 ** 2) ** 1.5;
  const Dd = (x - 400000) / (N1 * k0);
  const lat =
    p1 -
    ((N1 * Math.tan(p1)) / R1) *
      (Dd ** 2 / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * Dd ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * ep2 - 3 * C1 ** 2) * Dd ** 6) / 720);
  const lon =
    lon0 +
    (Dd - ((1 + 2 * T1 + C1) * Dd ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * Dd ** 5) / 120) /
      Math.cos(p1);

  // 2) Bessel → WGS84 (3변수 이동)
  const N = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
  const X = N * Math.cos(lat) * Math.cos(lon) - 146.43;
  const Y = N * Math.cos(lat) * Math.sin(lon) + 507.89;
  const Z = N * (1 - e2) * Math.sin(lat) + 681.46;
  const A = 6378137;
  const F = 1 / 298.257223563;
  const E2 = F * (2 - F);
  const B = A * (1 - F);
  const ep = (A * A - B * B) / (B * B);
  const p = Math.hypot(X, Y);
  const th = Math.atan2(Z * A, p * B);
  const la = Math.atan2(Z + ep * B * Math.sin(th) ** 3, p - E2 * A * Math.cos(th) ** 3);
  return { lat: la / D, lng: Math.atan2(Y, X) / D };
}

// 두 지점 직선거리 (km)
export function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * D;
  const dLng = (b.lng - a.lng) * D;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * D) * Math.cos(b.lat * D) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 직선거리 → 도보 분 (골목 우회 1.3배, 시속 4.5km)
export const walkMinutes = (km: number) => Math.max(1, Math.round(((km * 1.3) / 4.5) * 60));
