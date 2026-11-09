// 투표가 열리는 인원: 2명은 둘 다, 3명 이상은 절반(올림)
export function voteThreshold(headcount: number) {
  return headcount === 2 ? 2 : Math.ceil(headcount / 2);
}
