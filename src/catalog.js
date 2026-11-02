// 정원 아이템·꽃 친구·스킨·테마·패스 보상 목록 (plan.json config: gardenItems, friends, skins, themes, passTrack, R35, R38, R39).
// 값은 CONFIG 에서 읽는다. 이름은 i18n 의 item.<id>, skin.<id>, theme.<id> 키다.
import { CONFIG } from './config.js';

// ---- 정원 아이템 40종 (패스 20, 상점 20). kind: ground(바닥 1x1) | decor(장식 1x1) | building(건물 2x2) ----
export const ITEMS = {};
export const ITEM_LIST = [];
for (const g of CONFIG.gardenItems) {
  const branch = Number(g.branchId.slice(1));
  const pass = /^pass:(\d+)$/.exec(g.source);
  const it = {
    id: g.id, branch, kind: g.kind, size: g.size === '2x2' ? 2 : 1,
    source: pass ? 'pass' : 'shop', passLevel: pass ? Number(pass[1]) : 0, price: g.priceCoinCount || 0,
    nameKey: `item.${g.id}`
  };
  ITEMS[g.id] = it;
  ITEM_LIST.push(it);
}
export const SHOP_ITEMS = (branch) => ITEM_LIST.filter((i) => i.source === 'shop' && i.branch === branch);
export const isBuilding = (id) => !!ITEMS[id] && ITEMS[id].kind === 'building';

// ---- 꽃 친구 5종 (패스 5단계 보상) ----
export const FRIENDS = CONFIG.friends.map((s) => { const [id, b] = s.split('@'); return { id, branch: Number(b), nameKey: `item.${id}` }; });
export const FRIEND_BY_BRANCH = (b) => FRIENDS.find((f) => f.branch === b);

// ---- 이슬 스킨: 기본, 머리 장식 5(패스 15단계), 색 5(상점) ----
export const SKINS = CONFIG.skins.map((s) => {
  const [id, src] = s.split('@');
  const m = src ? /^(pass|shop)(\d)$/.exec(src) : null;
  const color = ['skin_peach', 'skin_mint', 'skin_sunset', 'skin_starlight', 'skin_rainbow'].includes(id);
  return { id, kind: id === 'skin_default' ? 'default' : color ? 'color' : 'hat', source: m ? m[1] : 'default', branch: m ? Number(m[2]) : 0, nameKey: `skin.${id}`, price: m && m[1] === 'shop' ? CONFIG.shopSkinPriceCoinCount : 0 };
});
export const SKIN_BY_ID = Object.fromEntries(SKINS.map((s) => [s.id, s]));
export const PASS_SKIN = (b) => SKINS.find((s) => s.source === 'pass' && s.branch === b);

// ---- 보드 테마: 기본 + 5 (상점) ----
export const THEMES = CONFIG.themes.map((s) => {
  const [raw, b] = s.split('@');
  const id = raw.replace(/\(.*\)$/, '');
  return { id, branch: b ? Number(b) : 0, nameKey: `theme.${id}`, price: b ? CONFIG.shopThemePriceCoinCount : 0 };
});
export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));

// ---- 정원 패스 15단계 보상 (R35, 3-5) ----
// 반환 { type: 'item'|'coins'|'hints'|'plot'|'friend'|'skin', id?, n? }
export function passReward(branch, level) {
  const tok = CONFIG.passTrack[level - 1];
  if (!tok) return null;
  const [kind, arg] = tok.split(':');
  if (kind === 'coins') return { type: 'coins', n: Number(arg) };
  if (kind === 'hints') return { type: 'hints', n: Number(arg) };
  if (kind === 'plot') return { type: 'plot', n: CONFIG.gardenPlotExpandTileCount };
  if (kind === 'friend') return { type: 'friend', id: FRIEND_BY_BRANCH(branch).id };
  if (kind === 'skin') return { type: 'skin', id: PASS_SKIN(branch).id };
  const it = ITEM_LIST.find((i) => i.branch === branch && i.source === 'pass' && i.passLevel === level);
  return it ? { type: 'item', id: it.id } : null;
}

// 아이템 그림 키: 바닥/장식은 한 장, 건물은 낮 그림을 대표로 쓴다
export const itemTexture = (id) => (isBuilding(id) ? `${id}_day` : id);
export const BUILDING_STATES = ['build', 'day', 'night'];

// 건물 겹침 레이어 (theme.garden.overlays): 건물 id -> 키
export const OVERLAY_OF = { b2_windmill: 'b2_windmill', b4_water_mill: 'b4_water_mill', b5_wind_tower: 'b5_wind_tower', b2_flower_shop: 'b2_flower_shop', b4_pavilion: 'b4_pavilion', b5_pinwheel: 'b5_pinwheel' };

// 장식 대기 움직임(3-12-5): id -> { kind: 'rot'|'skewX'|'scale'|'head', deg|ratio, ms, pivot: 'top'|'foot'|'center' }
export const DECOR_IDLE = {
  b1_wind_chime: { kind: 'rot', deg: 5, ms: 2400, pivot: 'top' },
  b1_sprout_bed: { kind: 'skewX', deg: 3, ms: 3000 },
  b2_ribbon_pole: { kind: 'rot', deg: 6, ms: 1800, pivot: 'top' },
  b4_lily_pot: { kind: 'scale', ratio: 1.03, ms: 3000 },
  b4_reed_bunch: { kind: 'skewX', deg: 4, ms: 2600 },
  b5_pinwheel: { kind: 'head', degPerS: 90 },
  b5_scarecrow: { kind: 'rot', deg: 3, ms: 3000, pivot: 'foot' },
  b5_kite_pole: { kind: 'rot', deg: 4, ms: 2000, pivot: 'foot' },
  b3_firefly_jar: { kind: 'fireflies' }
};
// 밤에 빛 번짐이 있는 장식 4종 (theme.garden.lampGlow.items)
export const LAMPS = ['b2_petal_lamp', 'b3_mushroom_lamp', 'b4_stone_lantern', 'b3_firefly_jar'];
