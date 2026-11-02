// 진행 저장 (R14). localStorage 접근은 모두 try/catch 로 감싸고, 실패하면 메모리에만 두고 게임을 계속한다.
// 저장 키 하나(config.saveKey)에 진행, 코인, 힌트, 튜토리얼, 패스 수령, 정원, 보유·적용 테마/스킨, 설정, 스테이지별 남은 되돌리기를 둔다.
// 코인/힌트는 wallet.js 만 getWallet/setWallet 으로 읽고 쓴다 (R20). 이 게임은 서버/랭킹이 없어 점수를 어디에도 제출하지 않는다.
import { CONFIG } from './config.js';
import { ITEMS, FRIENDS, SKIN_BY_ID, THEME_BY_ID } from './catalog.js';

const KEY = CONFIG.saveKey;
const OLD_KEY = 'dewdrop-path:v1'; // v4 저장 키: 코인, 힌트, 설정, tutorialSeen 만 옮기고 지운다
const PROBE = 'dewdrop-path.probe';

let available = true;
let timer = null;
const listeners = new Set();

const defaults = () => ({
  v: 5,
  stages: {},
  coins: 0,
  hints: CONFIG.hintFreeStartCount,
  tutorialSeen: {},
  sfx: true,
  music: true,
  lang: null,
  undoLeft: {},
  passClaimed: {},
  garden: { plot: CONFIG.gardenPlotStartTileCount, placed: [], tray: {}, friends: [], cam: { x: 0, y: 0 } },
  themeOwned: ['theme_default'],
  themeApplied: 'theme_default',
  skinOwned: ['skin_default'],
  skinApplied: 'skin_default',
  gardenNightHintSeen: false,
  branchSeen: {},
  lastBranch: 1
});

let data = null;

function probe() {
  try {
    localStorage.setItem(PROBE, '1');
    localStorage.removeItem(PROBE);
    return true;
  } catch (e) { return false; }
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k); // '__proto__' 같은 키와 목록에 없는 id 를 거른다
const FRIEND_IDS = new Set(FRIENDS.map((f) => f.id));
const int = (v, d, lo = 0, hi = Infinity) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d);

// 저장된 값을 현재 형식으로 맞춘다. 손상된 항목은 기본값으로 되돌린다. (undoLeft 의 손상 항목은 지우고 2로 본다)
function sanitize(raw) {
  const d = defaults();
  if (!isObj(raw)) return d;
  if (isObj(raw.stages)) {
    for (const [id, v] of Object.entries(raw.stages)) {
      const n = Number(id);
      if (n >= 1 && n <= CONFIG.stageCount && isObj(v) && Number.isFinite(v.stars) && Number.isFinite(v.moves)) d.stages[n] = { stars: int(v.stars, 0, 0, 3), moves: int(v.moves, 0, 0, 9999) };
    }
  }
  d.coins = int(raw.coins, 0, 0, CONFIG.coinMaxBalanceCount);
  d.hints = int(raw.hints, CONFIG.hintFreeStartCount, 0, CONFIG.hintMaxStockCount);
  if (isObj(raw.tutorialSeen)) for (const [k, v] of Object.entries(raw.tutorialSeen)) if (v === true) d.tutorialSeen[k] = true;
  d.sfx = raw.sfx !== false;
  d.music = raw.music !== false;
  d.lang = raw.lang === 'ko' || raw.lang === 'en' ? raw.lang : null;
  if (isObj(raw.undoLeft)) for (const [id, v] of Object.entries(raw.undoLeft)) { const n = Number(id); if (Number.isInteger(n) && n >= 1 && n <= CONFIG.stageCount && (v === 0 || v === 1)) d.undoLeft[n] = v; }
  if (isObj(raw.passClaimed)) {
    for (const [b, arr] of Object.entries(raw.passClaimed)) {
      const bn = Number(b);
      if (Number.isInteger(bn) && bn >= 1 && bn <= CONFIG.branchCount && Array.isArray(arr)) d.passClaimed[bn] = [...new Set(arr.filter((x) => Number.isInteger(x) && x >= 1 && x <= CONFIG.passLevelCount))];
    }
  }
  if (isObj(raw.garden)) {
    const g = raw.garden;
    d.garden.plot = int(g.plot, CONFIG.gardenPlotStartTileCount, CONFIG.gardenPlotStartTileCount, CONFIG.gardenPlotMaxTileCount);
    if (d.garden.plot % 2) d.garden.plot = CONFIG.gardenPlotStartTileCount;
    if (Array.isArray(g.placed)) {
      d.garden.placed = g.placed.slice(0, CONFIG.gardenPlotMaxTileCount * CONFIG.gardenPlotMaxTileCount).filter((p) => isObj(p) && typeof p.id === 'string' && has(ITEMS, p.id) && Number.isInteger(p.x) && Number.isInteger(p.y)).map((p) => ({ id: p.id, x: p.x, y: p.y, flip: !!p.flip }));
    }
    if (isObj(g.tray)) for (const [id, n] of Object.entries(g.tray)) if (has(ITEMS, id) && Number.isInteger(n) && n > 0) d.garden.tray[id] = Math.min(n, CONFIG.gardenItemMaxStackCount);
    if (Array.isArray(g.friends)) d.garden.friends = [...new Set(g.friends.filter((x) => typeof x === 'string' && FRIEND_IDS.has(x)))].slice(0, CONFIG.gardenFriendMaxCount);
    if (isObj(g.cam) && Number.isFinite(g.cam.x) && Number.isFinite(g.cam.y)) d.garden.cam = { x: g.cam.x, y: g.cam.y };
  }
  if (Array.isArray(raw.themeOwned)) d.themeOwned = [...new Set(['theme_default', ...raw.themeOwned.filter((x) => typeof x === 'string' && has(THEME_BY_ID, x))])];
  if (Array.isArray(raw.skinOwned)) d.skinOwned = [...new Set(['skin_default', ...raw.skinOwned.filter((x) => typeof x === 'string' && has(SKIN_BY_ID, x))])];
  // 적용 중 테마·스킨이 보유 목록에 없으면(손상) 기본으로 되돌린다
  d.themeApplied = d.themeOwned.includes(raw.themeApplied) ? raw.themeApplied : 'theme_default';
  d.skinApplied = d.skinOwned.includes(raw.skinApplied) ? raw.skinApplied : 'skin_default';
  d.gardenNightHintSeen = raw.gardenNightHintSeen === true;
  d.lastBranch = int(raw.lastBranch, 1, 1, CONFIG.branchCount);
  if (isObj(raw.branchSeen)) for (const [k, v] of Object.entries(raw.branchSeen)) if (v === true) d.branchSeen[k] = true;
  return d;
}

function load() {
  available = probe();
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { available = false; }
  if (raw === null) return migrateV4();
  try {
    return sanitize(JSON.parse(raw));
  } catch (e) { /* 손상된 저장: 아래에서 기본값으로 덮어쓴다 */ }
  const fresh = defaults();
  try { localStorage.setItem(KEY, JSON.stringify(fresh)); } catch (e) { available = false; }
  return fresh;
}

// v4 저장(키 dewdrop-path:v1)이 있으면 코인, 힌트, 설정, tutorialSeen 만 옮기고 v4 키를 지운다 (스테이지 배치가 모두 바뀌어 진행은 버린다)
function migrateV4() {
  const fresh = defaults();
  let old = null;
  try { const r = localStorage.getItem(OLD_KEY); if (r) old = JSON.parse(r); } catch (e) { /* 무시 */ }
  if (!isObj(old)) return fresh;
  fresh.coins = int(old.coins, 0, 0, CONFIG.coinMaxBalanceCount);
  fresh.hints = int(old.hints, CONFIG.hintFreeStartCount, 0, CONFIG.hintMaxStockCount);
  fresh.sfx = old.sfx !== false;
  fresh.music = old.music !== false;
  fresh.lang = old.lang === 'ko' || old.lang === 'en' ? old.lang : null;
  if (isObj(old.tutorialSeen)) for (const [k, v] of Object.entries(old.tutorialSeen)) if (v === true && ['swipe', 'undo', 'starGoal', 'hintTip'].includes(k)) fresh.tutorialSeen[k] = true;
  try { localStorage.setItem(KEY, JSON.stringify(fresh)); localStorage.removeItem(OLD_KEY); } catch (e) { available = false; }
  return fresh;
}

data = load();

function flush() {
  timer = null;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    if (available) { available = false; listeners.forEach((fn) => fn(available)); }
  }
}

// 200ms 디바운스로 저장한다.
function persist() {
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(flush, CONFIG.autoSaveDebounceMs);
}

export function flushNow() { if (timer !== null) clearTimeout(timer); flush(); }
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { if (timer !== null) flushNow(); });
  // 모바일에서 백그라운드로 가면 pagehide 가 오지 않을 수 있어 화면이 가려질 때도 바로 저장한다 (코인/힌트 유실 방지)
  document.addEventListener('visibilitychange', () => { if (document.hidden && timer !== null) flushNow(); });
}

export const isSaveAvailable = () => available;
export const onSaveAvailability = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// ---- 설정 ----
export const getLang = () => data.lang;
export function setLang(l) { data.lang = l; persist(); }
export const isSfxOn = () => data.sfx !== false;
export const isMusicOn = () => data.music !== false;
export function setSfxOn(v) { data.sfx = !!v; persist(); }
export function setMusicOn(v) { data.music = !!v; persist(); }

// ---- 튜토리얼 안내: 각각 첫 1회만 보인다 ----
export const hasSeen = (k) => !!data.tutorialSeen[k];
export function markSeen(k) {
  if (data.tutorialSeen[k]) return;
  data.tutorialSeen[k] = true;
  persist();
}
export const hasSeenBranch = (b) => !!data.branchSeen[b];
export function markBranchSeen(b) { if (!data.branchSeen[b]) { data.branchSeen[b] = true; persist(); } }

export const getLastBranch = () => data.lastBranch;
export function setLastBranch(b) { if (data.lastBranch !== b) { data.lastBranch = b; persist(); } }

// ---- 코인/힌트 (wallet.js 만 호출) ----
export const getWallet = () => ({ coins: data.coins, hints: data.hints });
export function setWallet(coins, hints) {
  data.coins = Math.max(0, Math.min(CONFIG.coinMaxBalanceCount, Math.floor(coins)));
  data.hints = Math.max(0, Math.min(CONFIG.hintMaxStockCount, Math.floor(hints)));
  persist();
}

// ---- 스테이지 기록 ----
export const getRecord = (id) => data.stages[id] || { stars: 0, moves: 0 };
export const allRecords = () => data.stages;

// R4: 이동 횟수 -> 별 개수
export function starsFor(moves, goal) {
  if (moves <= goal) return 3;
  if (moves <= goal + CONFIG.starTwoExtraMoveCount) return 2;
  return 1;
}

// 클리어 기록. 더 좋은 값만 갱신한다 (별은 높을수록, 이동은 적을수록). 클리어한 스테이지의 되돌리기 남은 횟수는 지운다(2로 초기화, R5).
export function recordClear(id, moves, goal) {
  const stars = starsFor(moves, goal);
  const prev = getRecord(id);
  const first = prev.stars === 0;
  const betterStars = stars > prev.stars;
  const betterMoves = first || moves < prev.moves;
  if (betterStars || betterMoves) data.stages[id] = { stars: Math.max(stars, prev.stars), moves: first ? moves : Math.min(moves, prev.moves) };
  if (data.undoLeft[id] !== undefined) delete data.undoLeft[id];
  persist();
  return { stars, prev, first, newBest: first || betterStars || betterMoves, best: data.stages[id].moves, perfect: stars === 3 };
}

// ---- 스테이지별 되돌리기 남은 횟수 (R5, R14): 2면 항목 없음, 사용 즉시 저장, 클리어 때 삭제 ----
export const getUndoLeft = (id) => (data.undoLeft[id] === 0 || data.undoLeft[id] === 1 ? data.undoLeft[id] : CONFIG.undoPerStageCount);
export function useUndo(id) {
  const left = getUndoLeft(id);
  if (left <= 0) return false;
  data.undoLeft[id] = left - 1;
  flushNow(); // 사용 즉시 저장
  return true;
}

// ---- 패스 수령 (R35) ----
export const getClaimed = (branch) => (data.passClaimed[branch] || []).slice();
export const isClaimed = (branch, level) => (data.passClaimed[branch] || []).includes(level);
export function markClaimed(branch, level) {
  const arr = data.passClaimed[branch] || (data.passClaimed[branch] = []);
  if (!arr.includes(level)) arr.push(level);
  persist();
}

// ---- 정원 (R36): garden 객체를 직접 고치고 saveGarden() 으로 저장한다 ----
export const getGarden = () => data.garden;
export const saveGarden = () => persist();
export const getGardenNightHintSeen = () => data.gardenNightHintSeen;
export function setGardenNightHintSeen() { data.gardenNightHintSeen = true; flushNow(); }

// ---- 테마/스킨 (R39) ----
export const ownsTheme = (id) => data.themeOwned.includes(id);
export const ownsSkin = (id) => data.skinOwned.includes(id);
export function addTheme(id) { if (!data.themeOwned.includes(id)) { data.themeOwned.push(id); persist(); } }
export function addSkin(id) { if (!data.skinOwned.includes(id)) { data.skinOwned.push(id); persist(); } }
export const appliedTheme = () => data.themeApplied;
export const appliedSkin = () => data.skinApplied;
export function applyTheme(id) { if (data.themeOwned.includes(id)) { data.themeApplied = id; persist(); } }
export function applySkin(id) { if (data.skinOwned.includes(id)) { data.skinApplied = id; persist(); } }

// 기록 삭제: 진행, 코인, 힌트, 패스, 정원, 보유 테마·스킨, tutorialSeen 을 모두 초기화하고 무료 힌트를 다시 준다. 설정(소리, 언어)은 유지한다.
export function resetProgress() {
  const keep = { sfx: data.sfx, music: data.music, lang: data.lang };
  data = { ...defaults(), ...keep };
  flushNow();
}
