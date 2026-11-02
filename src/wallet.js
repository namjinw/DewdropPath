// 지갑 (R19, R20): 코인 잔액, 힌트 보유 수, 코인 획득, 힌트 구매, 힌트 사용 차감, 상점 구매, 패스 보상 지급은 이 모듈에서만 바꾼다.
// 화면과 PlayScene 은 아래 함수만 호출하고 잔액을 직접 고치지 않는다. 결제, 충전, 현금 구매는 없다. (코인은 별과 클리어로만 얻는다)
import { CONFIG } from './config.js';
import * as save from './save.js';
import { ITEMS, SKIN_BY_ID, THEME_BY_ID, passReward, FRIEND_BY_BRANCH } from './catalog.js';

const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(save.getWallet()));

export const getBalance = () => save.getWallet().coins;
export const getHintCount = () => save.getWallet().hints;
export const onWalletChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const canBuyHint = () => getBalance() >= CONFIG.hintPriceCoinCount && getHintCount() < CONFIG.hintMaxStockCount;
export const isHintStockFull = () => getHintCount() >= CONFIG.hintMaxStockCount;

export function addCoins(n) {
  const add = Math.max(0, Math.floor(n) || 0);
  if (!add) return getBalance();
  const w = save.getWallet();
  save.setWallet(w.coins + add, w.hints); // 상한 99,999 초과분은 버린다 (save.setWallet 이 자른다)
  emit();
  return getBalance();
}

export function spendCoins(n) {
  const w = save.getWallet();
  const cost = Math.max(0, Math.floor(n) || 0);
  if (cost > w.coins) return false;
  save.setWallet(w.coins - cost, w.hints);
  emit();
  return true;
}

// 코인 40 이상이고 보유가 99 미만일 때만 힌트 1개를 산다. 성공하면 true.
export function buyHint() {
  const w = save.getWallet();
  if (w.coins < CONFIG.hintPriceCoinCount || w.hints >= CONFIG.hintMaxStockCount) return false;
  save.setWallet(w.coins - CONFIG.hintPriceCoinCount, w.hints + 1);
  emit();
  return true;
}

// 힌트 표시에 성공했을 때만 호출한다 (R18). 0개면 false.
export function useHint() {
  const w = save.getWallet();
  if (w.hints <= 0) return false;
  save.setWallet(w.coins, w.hints - 1);
  emit();
  return true;
}

// R19: 첫 클리어(저장된 최고 별 0) = 10 + 별 x 5, 재클리어 = 늘어난 별 x 5 (늘지 않으면 0)
export function coinsForClear(prevStars, stars) {
  if (prevStars <= 0) return CONFIG.coinFirstClearBonusCount + stars * CONFIG.coinPerStarCount;
  return Math.max(0, stars - prevStars) * CONFIG.coinReplayPerNewStarCount;
}

// 클리어 보상을 지급하고 { earned, before, after } 를 돌려준다.
export function awardClear(prevStars, stars) {
  const before = getBalance();
  const earned = coinsForClear(prevStars, stars);
  addCoins(earned);
  return { earned, before, after: getBalance() };
}

// ---- 정원 보관함 (R36) ----
export const trayCount = (id) => save.getGarden().tray[id] || 0;
export const placedCount = (id) => save.getGarden().placed.filter((p) => p.id === id).length;
export const ownedCount = (id) => trayCount(id) + placedCount(id);
export function addToTray(id, n = 1) {
  const g = save.getGarden();
  g.tray[id] = Math.min(CONFIG.gardenItemMaxStackCount, (g.tray[id] || 0) + n);
  save.saveGarden();
}

// ---- 패스 보상 지급 (R35): 한 함수로만 처리한다 ----
// 반환: { reward, coinsFromOverflow }
export function grantReward(branch, level) {
  const r = passReward(branch, level);
  if (!r) return null;
  let overflowCoins = 0;
  if (r.type === 'coins') addCoins(r.n);
  else if (r.type === 'hints') {
    const w = save.getWallet();
    const room = CONFIG.hintMaxStockCount - w.hints;
    const give = Math.min(room, r.n);
    overflowCoins = (r.n - give) * CONFIG.passHintOverflowCoinCount;
    save.setWallet(w.coins, w.hints + give);
    if (overflowCoins) addCoins(overflowCoins); else emit();
  } else if (r.type === 'plot') {
    const g = save.getGarden();
    g.plot = Math.min(CONFIG.gardenPlotMaxTileCount, g.plot + r.n);
    save.saveGarden();
  } else if (r.type === 'friend') {
    const g = save.getGarden();
    if (!g.friends.includes(r.id) && g.friends.length < CONFIG.gardenFriendMaxCount) g.friends.push(r.id);
    save.saveGarden();
  } else if (r.type === 'skin') save.addSkin(r.id);
  else if (r.type === 'item') addToTray(r.id, 1);
  save.markClaimed(branch, level);
  emit();
  return { reward: r, overflowCoins };
}

// ---- 상점 구매 (R38): 성공하면 true ----
export const canBuyItem = (id) => {
  const it = ITEMS[id];
  if (!it || it.source !== 'shop') return false;
  if (it.kind === 'building') { if (ownedCount(id) >= 1) return false; } else if (ownedCount(id) >= CONFIG.gardenItemMaxStackCount) return false;
  return getBalance() >= it.price;
};
export function buyItem(id) {
  if (!canBuyItem(id)) return false;
  spendCoins(ITEMS[id].price);
  addToTray(id, 1);
  return true;
}
export function buyTheme(id) {
  const t = THEME_BY_ID[id];
  if (!t || !t.branch || save.ownsTheme(id) || getBalance() < t.price) return false;
  spendCoins(t.price);
  save.addTheme(id);
  return true;
}
export function buySkin(id) {
  const s = SKIN_BY_ID[id];
  if (!s || s.source !== 'shop' || save.ownsSkin(id) || getBalance() < s.price) return false;
  spendCoins(s.price);
  save.addSkin(id);
  return true;
}
export { FRIEND_BY_BRANCH };
