// 힌트 (R18): 이동 기록을 저장된 최적 해법들과 비교해 첫 실수 직전으로 되감고 바른 다음 한 수를 알려 준다. 런타임 풀이기는 없다.
// history: 방향 글자 배열(U R D L). solutions: 문자열 배열. 반환: { rewind(되감을 수), next(방향 글자) } 또는 null(해법 데이터 오류).
export function computeHint(solutions, history) {
  if (!Array.isArray(solutions) || !solutions.length) return null;
  let best = -1;
  let bestSol = null;
  for (const s of solutions) {
    let k = 0;
    while (k < history.length && k < s.length && s[k] === history[k]) k++;
    if (k > best) { best = k; bestSol = s; }
  }
  if (best < 0 || !bestSol || best >= bestSol.length) return null;
  return { rewind: history.length - best, keep: best, next: bestSol[best] };
}
