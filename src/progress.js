// 진행에서 계산되는 값: 별 합계, 해금(R12), 패스 단계(R35), 받을 보상 수.
import { CONFIG } from './config.js';
import * as save from './save.js';
import { idOf, branchOf, localOf, BRANCH_STAGES } from './stages.js';

const stars = (id) => save.getRecord(id).stars;

export function branchStars(b) {
  let n = 0;
  for (let i = 1; i <= BRANCH_STAGES; i++) n += stars(idOf(b, i));
  return n;
}
export const totalStars = () => { let n = 0; for (let b = 1; b <= CONFIG.branchCount; b++) n += branchStars(b); return n; };
export function perfectCount(b) {
  let n = 0;
  for (let i = 1; i <= BRANCH_STAGES; i++) if (stars(idOf(b, i)) === 3) n++;
  return n;
}
export const perfectTotal = () => { let n = 0; for (let b = 1; b <= CONFIG.branchCount; b++) n += perfectCount(b); return n; };
// 모든 스테이지를 한 번 이상 클리어했는가 (엔딩 조건)
export function allStagesCleared() {
  for (let id = 1; id <= CONFIG.stageCount; id++) if (!(stars(id) >= 1)) return false;
  return true;
}
export function clearedMax(b) {
  let m = 0;
  for (let i = 1; i <= BRANCH_STAGES; i++) if (stars(idOf(b, i)) >= 1) m = i;
  return m;
}
export const hasAnyRecord = () => Object.values(save.allRecords()).some((r) => r.stars >= 1);

// 챕터 k+1 은 k-34 클리어 + 챕터 k 별 51 이상 (R12)
export function isBranchUnlocked(b) {
  if (b <= 1) return true;
  return stars(idOf(b - 1, BRANCH_STAGES)) >= 1 && branchStars(b - 1) >= CONFIG.branchUnlockStarCount;
}
export const branchStarsNeeded = (b) => Math.max(0, CONFIG.branchUnlockStarCount - branchStars(b - 1));
// 챕터 안에서는 클리어한 가장 뒤 번호 + 2 까지 열린다
export function isStageUnlocked(id) {
  const b = branchOf(id);
  if (!isBranchUnlocked(b)) return false;
  return localOf(id) <= clearedMax(b) + Math.max(1, CONFIG.stageOpenAheadCount);
}
// 다음 스테이지 id (같은 챕터, 마지막이면 다음 챕터 첫 스테이지). 열려 있지 않거나 없으면 null
export function nextStageId(id) {
  let nx = id + 1;
  if (nx > CONFIG.stageCount) return null;
  if (!isStageUnlocked(nx)) return null;
  return nx;
}
// 플레이 버튼: 기록이 없으면 1-1, 있으면 S2(최근 챕터)
export const recentBranch = () => save.getLastBranch();

// ---- 패스 (R35) ----
export const passLevel = (b) => Math.min(CONFIG.passLevelCount, Math.floor(branchStars(b) / CONFIG.passStarsPerLevelCount));
export const passStarsFor = (level) => level * CONFIG.passStarsPerLevelCount;
export const passStarsToNext = (b) => { const lv = passLevel(b); return lv >= CONFIG.passLevelCount ? 0 : passStarsFor(lv + 1) - branchStars(b); };
export function claimableLevels(b) {
  if (!isBranchUnlocked(b)) return [];
  const out = [];
  for (let l = 1; l <= passLevel(b); l++) if (!save.isClaimed(b, l)) out.push(l);
  return out;
}
export function claimableCount() {
  let n = 0;
  for (let b = 1; b <= CONFIG.branchCount; b++) n += claimableLevels(b).length;
  return n;
}
