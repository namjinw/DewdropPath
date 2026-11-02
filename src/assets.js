// 이미지 목록과 지연 불러오기. 키는 파일 이름(확장자 제외)이다. 첫 로딩에는 판 위 요소와 UI 만 불러오고,
// 정원 아이템(건물 3상태, 장식, 바닥, 꽃 친구, 해/달)은 S6, S8, S9 에 처음 들어갈 때 나눠 불러온다 (plan 6번).
import { CONFIG } from './config.js';
import { SFX_FILES } from './audio.js';
import { ITEM_LIST, FRIENDS, BUILDING_STATES } from './catalog.js';

export const AI_DIR = 'assets/images/ai';
export const UI_DIR = 'assets/images/ui';

export const CORE_AI = [
  'dew_body', 'dew_body_left', 'flower_0_bud', 'flower_1_wake', 'flower_2_half', 'flower_3_bloom', 'grass_a', 'grass_b', 'rock', 'tree', 'dirt', 'dirt_wet',
  'ice', 'ice_crack', 'puddle', 'petal_portal', 'arrow_leaf', 'mushroom', 'pot', 'acorn', 'frog', 'star_empty', 'star_full', 'coin', 'hint_bulb', 'lock',
  'crown', 'badge_perfect', 'reward_closed', 'reward_open', 'cloud', 'b1_gardener_hut_day',
  'skin_sprout_hat', 'skin_petal_ribbon', 'skin_mushroom_cap', 'skin_lily_umbrella', 'skin_acorn_cap'
];
export const UI_FILES = [
  'ui-green-button-rectangle-depth-flat', 'ui-green-button-square-depth-flat', 'ui-green-button-round-depth-flat',
  'ui-blue-button-rectangle-depth-flat', 'ui-blue-button-square-depth-flat', 'ui-blue-button-round-depth-flat',
  'ui-grey-button-rectangle-depth-flat', 'ui-grey-button-square-depth-flat', 'ui-grey-button-round-depth-flat',
  'ui-grey-button-rectangle-flat', 'ui-green-button-rectangle-flat', 'ui-blue-icon-checkmark', 'ui-grey-icon-cross',
  'ui-extra-icon-play-dark', 'ui-extra-icon-repeat-dark'
];
export const GARDEN_EXTRA = ['sun', 'moon', 'fx_flag', 'b2_windmill_blades', 'b4_water_mill_wheel', 'b5_wind_tower_vane', 'b5_pinwheel_head'];

// 정원 아이템 한 개에 필요한 이미지 키들
export function itemImages(id) {
  const it = ITEM_LIST.find((i) => i.id === id);
  if (!it) return [];
  if (it.kind === 'building') return BUILDING_STATES.map((s) => `${id}_${s}`);
  return id === 'b5_pinwheel' ? [id, 'b5_pinwheel_head'] : [id];
}
export const ALL_GARDEN_IMAGES = [
  ...GARDEN_EXTRA, ...FRIENDS.map((f) => f.id),
  ...ITEM_LIST.flatMap((it) => itemImages(it.id))
];

// 필요한 이미지 중 아직 없는 것을 불러온다. 이미 다 있으면 바로 cb.
// 장면이 아직 살아 있는지 (만드는 중(CREATING)도 포함: 캐시된 이미지는 create() 안에서 바로 콜백이 불린다)
export const sceneAlive = (scene) => scene.sys.settings.status < Phaser.Scenes.SHUTDOWN;

export function ensureImages(scene, keys, cb) {
  const todo = [...new Set(keys)].filter((k) => !scene.textures.exists(k));
  if (!todo.length) { cb(); return; }
  for (const k of todo) scene.load.image(k, `${AI_DIR}/${k}.webp`);
  scene.load.once('complete', cb);
  scene.load.start();
}
export const sfxFiles = () => SFX_FILES;
export const spriteScale = (CONFIG && CONFIG.cellSizePx) || 80;
