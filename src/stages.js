// 스테이지 접근 도우미. 데이터(stages-data.js)는 tools/generate-stages.mjs 가 만들고 검증한 값이다. 직접 고치지 않는다.
import { CONFIG } from './config.js';
import { STAGES } from './stages-data.js';
import { parseStage } from './puzzle.js';

export { STAGES };
export const BRANCH_STAGES = CONFIG.branchStageCount;
export const idOf = (b, n) => (b - 1) * BRANCH_STAGES + n;
export const branchOf = (id) => Math.floor((id - 1) / BRANCH_STAGES) + 1;
export const localOf = (id) => ((id - 1) % BRANCH_STAGES) + 1;
export const labelOf = (id) => `${branchOf(id)}-${localOf(id)}`;
export const stageById = (id) => STAGES[id - 1];

const LETTER = { U: 0, R: 1, D: 2, L: 3 };
export const DIR_LETTERS = ['U', 'R', 'D', 'L'];
export const letterToDir = (c) => LETTER[c];

const cache = new Map();
// 파싱된 레벨(puzzle.js parseStage). 한 번만 만든다.
export function levelOf(id) {
  let lv = cache.get(id);
  if (!lv) { lv = parseStage(stageById(id)); cache.set(id, lv); }
  return lv;
}

// 도입 스테이지(그 요소가 처음 나오는 스테이지): 새 요소 배너 F18 과 설명 카드 R22 에 쓴다. 키: 스테이지 id -> 카드 키
export const NEW_ELEMENT = { '1-6': 'ice', '1-12': 'dirt', '2-1': 'arrow', '2-12': 'petal', '3-1': 'mushroom', '3-12': 'tree', '4-1': 'pot', '4-12': 'frog', '5-1': 'acorn' };
export const NEW_ELEMENT_BY_ID = Object.fromEntries(Object.entries(NEW_ELEMENT).map(([k, v]) => { const [b, n] = k.split('-').map(Number); return [idOf(b, n), v]; }));

// 숨은 상호작용(R43, 3-9): id -> { introId, a, b, key }. a, b 는 요소 이름이다(H6, H7 은 acorn 하나)
export const HIDDEN = CONFIG.hiddenInteractions.map((h) => {
  const [b, n] = h.introStage.split('-').map(Number);
  const [a, c] = h.with.split('+');
  return { id: h.id, introId: idOf(b, n), a, b: c || null, key: h.cardKey, with: h.with };
});
