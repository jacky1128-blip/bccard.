// 예매한 열차(KTX/SRT) → 도착역·도착 시간 (서버에서만 호출)
// TODO: 실제 열차 조회 연동으로 교체. 지금은 화면 확인용 데모 값
//  - 예매 내역 직접 연동(코레일·SR 로그인 필요)은 일반 사용자 서비스에 못 붙여서,
//    "열차 종류 + 열차번호 + 날짜"로 시간표를 조회하는 방식을 전제로 함
//  - 연동이 실패하거나 없어도 사용자는 도착역·시간을 직접 입력해서 넘어갈 수 있음 (TravelForm)

export type TrainType = 'KTX' | 'SRT';
export type TrainInfo = { type: TrainType; no: string; date: string; from: string; to: string; depart: string; arrive: string; demo: boolean };

export async function lookupTrain(type: TrainType, no: string, date: string): Promise<TrainInfo | null> {
  const n = Number(no.replace(/\D/g, ''));
  if (!n) return null;
  // 데모: 열차번호로 그럴듯한 시간을 만들어 냄 (실제 시간표 아님)
  const departMin = (5 * 60 + ((n * 37) % (16 * 60))) % (24 * 60);
  const arriveMin = departMin + 150 + (n % 3) * 10;
  const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return {
    type,
    no: String(n),
    date,
    from: type === 'SRT' ? '수서역' : '서울역',
    to: '부산역',
    depart: hhmm(departMin),
    arrive: hhmm(arriveMin),
    demo: true,
  };
}
