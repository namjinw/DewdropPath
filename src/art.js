// 코드로 만드는 아트를 Canvas 2D 로 구워 텍스처로 쓴다 (외부 이미지 없음). design/theme.json 의 값을 그대로 쓴다.
//  - pastelize 굽기(theme.pastelize): 채도 행렬 + 흰색 쪽으로 밀기. 한 번만 계산하고 '<키>@pastel' 같은 새 텍스처로 둔다.
//  - 코드 아이콘(theme.codeIcons), 입자 텍스처(theme.themeParticles), 토스트/말풍선/칩/리본의 알약 텍스처, 부드러운 그림자, 빛 번짐.
//  - 챕터별 배경 3층(먼 산, 덤불, 앞 잎)과 하늘 (theme.zones).
import { THEME } from './theme.js';

export const ART_SCALE = 2; // 코드 아트는 2배로 구워 고해상도 화면에서도 선명하게 하고 화면에는 1/2 로 그린다
const T = THEME;
export const hexNum = (s) => parseInt(s.slice(1), 16);

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// 1x 좌표로 그리는 함수를 2x 캔버스에 구워 텍스처로 만든다
export function bake(scene, key, w, h, draw, scale = ART_SCALE) {
  if (scene.textures.exists(key)) return;
  const c = makeCanvas(w * scale, h * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  draw(ctx, w, h);
  scene.textures.addCanvas(key, c);
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function vGrad(ctx, y0, y1, c0, c1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  return g;
}

// 글로우 알약(theme.glow[kind]): 글로우 색의 번짐만 남긴 nineslice 용 텍스처 (필터 글로우 대신). 96x96 에 모서리 36, 도형 가장자리는 24
export function bakeGlowBlob(scene, kind) {
  const key = `glow_blob_${kind}`;
  const g = THEME.glow[kind];
  bake(scene, key, 96, 96, (ctx) => {
    const n = hexNum(g.color);
    ctx.shadowColor = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},1)`;
    // 그림자 오프셋과 번짐은 캔버스 변환(2배)의 영향을 받지 않는 실제 픽셀 값이다
    ctx.shadowBlur = (6 + g.outerStrength) * ART_SCALE; ctx.shadowOffsetX = 1000 * ART_SCALE;
    ctx.fillStyle = '#000';
    for (let i = 0; i < 2; i++) { roundRect(ctx, 24 - 1000, 24, 48, 48, 14); ctx.fill(); }
  });
  return key;
}

// ---- pastelize 굽기 ----
// W3C feColorMatrix saturate(s) 다음에 c = c * (1 - l) + l. 알파는 그대로. 반환: 새 텍스처 키
export function pastelize(scene, key, s, l, suffix = '@pastel') {
  const out = `${key}${suffix}`;
  if (scene.textures.exists(out) || !scene.textures.exists(key)) return out;
  const src = scene.textures.get(key).getSourceImage();
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const im = ctx.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  const a = 0.213 + 0.787 * s, b = 0.715 - 0.715 * s, cc = 0.072 - 0.072 * s;
  const e = 0.213 - 0.213 * s, f = 0.715 + 0.285 * s, g = 0.072 - 0.072 * s;
  const h = 0.213 - 0.213 * s, i = 0.715 - 0.715 * s, j = 0.072 + 0.928 * s;
  const k = 1 - l;
  const L = l * 255;
  for (let p = 0; p < d.length; p += 4) {
    const r = d[p], gg = d[p + 1], bb = d[p + 2];
    d[p] = Math.max(0, Math.min(255, (a * r + b * gg + cc * bb) * k + L));
    d[p + 1] = Math.max(0, Math.min(255, (e * r + f * gg + g * bb) * k + L));
    d[p + 2] = Math.max(0, Math.min(255, (h * r + i * gg + j * bb) * k + L));
  }
  ctx.putImageData(im, 0, 0);
  scene.textures.addCanvas(out, c);
  return out;
}

const BTN_KEYS = ['green', 'blue'].flatMap((col) => ['rectangle', 'square', 'round'].map((sh) => `ui-${col}-button-${sh}-depth-flat`));
const GREY_KEYS = ['rectangle', 'square', 'round'].map((sh) => `ui-grey-button-${sh}-depth-flat`);

// 모든 화면이 쓰는 UI 굽기: 버튼(@pastel 평상, @pastelHi 호버), 회색 호버(@hi), 진행 막대, 체크, 풀 칸, 이슬 중립 몸통
export function bakeUi(scene) {
  const bu = T.pastelize.buttonUi;
  const bh = T.pastelize.buttonUiHi;
  for (const k of [...BTN_KEYS, 'ui-green-button-rectangle-flat', 'ui-blue-icon-checkmark']) {
    pastelize(scene, k, bu.s, bu.l, '@pastel');
  }
  for (const k of BTN_KEYS) pastelize(scene, k, bh.s, bh.l, '@pastelHi');
  for (const k of GREY_KEYS) pastelize(scene, k, T.pastelize.greyHi.s, T.pastelize.greyHi.l, '@hi');
  const bg = T.pastelize.boardGrass;
  pastelize(scene, 'grass_a', bg.s, bg.l, '@pastel');
  pastelize(scene, 'grass_b', bg.s, bg.l, '@pastel');
  const dn = T.pastelize.dewNeutral;
  pastelize(scene, 'dew_body', dn.s, dn.l, '@neutral');
  pastelize(scene, 'dew_body_left', dn.s, dn.l, '@neutral');
}

// 정원 이미지 굽기(lazy): 바닥 5종 floorLime, 건물 _build/_day + 장식 + 겹침 레이어 objectDay, _night objectNight
export function bakeGardenTexture(scene, key, kind) {
  if (kind === 'floor') { const p = T.pastelize.floorLime; return pastelize(scene, key, p.s, p.l, '@floor'); }
  if (kind === 'night') { const p = T.pastelize.objectNight; return pastelize(scene, key, p.s, p.l, '@night'); }
  const p = T.pastelize.objectDay;
  return pastelize(scene, key, p.s, p.l, '@day');
}

// ---- 코드 아이콘 (theme.codeIcons: 48px 격자, 선 두께 5, 잉크색) ----
const ICON_PATHS = {
  undo: [['M13 20 H31 a10 10 0 0 1 0 20 H20', 'stroke', 5], ['M20 11 L10 20 L20 29', 'stroke', 5]],
  pause: [['M17.5 11 H18.5 a3.5 3.5 0 0 1 3.5 3.5 V33.5 a3.5 3.5 0 0 1 -3.5 3.5 H17.5 a3.5 3.5 0 0 1 -3.5 -3.5 V14.5 a3.5 3.5 0 0 1 3.5 -3.5 Z', 'fill'], ['M31.5 11 H32.5 a3.5 3.5 0 0 1 3.5 3.5 V33.5 a3.5 3.5 0 0 1 -3.5 3.5 H31.5 a3.5 3.5 0 0 1 -3.5 -3.5 V14.5 a3.5 3.5 0 0 1 3.5 -3.5 Z', 'fill']],
  zoom: [['M32 21 a11 11 0 1 0 -22 0 a11 11 0 1 0 22 0', 'stroke', 5], ['M29 29 L38 38', 'stroke', 6], ['M16 21 H26 M21 16 V26', 'stroke', 4]],
  flip: [['M24 8 V40', 'dash', 3], ['M19 14 L7 34 H19 Z', 'fill'], ['M29 14 L41 34 H29 Z', 'stroke', 3.5]],
  store: [['M8 18 H40 V38 a3 3 0 0 1 -3 3 H11 a3 3 0 0 1 -3 -3 Z', 'stroke', 4.5], ['M6 12 H42 V18 H6 Z', 'fill'], ['M19 26 H29', 'stroke', 4.5]],
  hand: [['M18 26 V10 a3.5 3.5 0 0 1 7 0 V22 V18 a3.5 3.5 0 0 1 7 0 V24 a3.5 3.5 0 0 1 7 0 V32 c0 7 -5 12 -12 12 h-2 c-5 0 -8 -3 -11 -7 l-6 -8 a3.4 3.4 0 0 1 5 -4.5 Z', 'whitefill', 3]],
  back: [['M28 10 L14 24 L28 38', 'stroke', 6]],
  share: [['M19 24 a5 5 0 1 0 -10 0 a5 5 0 1 0 10 0', 'fill'], ['M39 13 a5 5 0 1 0 -10 0 a5 5 0 1 0 10 0', 'fill'], ['M39 35 a5 5 0 1 0 -10 0 a5 5 0 1 0 10 0', 'fill'], ['M14 24 L34 13 M14 24 L34 35', 'stroke', 3.5]],
  music: [['M18 34 V12 L36 8 V30', 'stroke', 4.5], ['M19.5 34 a5.5 5.5 0 1 0 -11 0 a5.5 5.5 0 1 0 11 0', 'fill'], ['M37.5 30 a5.5 5.5 0 1 0 -11 0 a5.5 5.5 0 1 0 11 0', 'fill']],
  sfx: [['M8 19 H15 L24 11 V37 L15 29 H8 Z', 'fill'], ['M30 17 a9 9 0 0 1 0 14 M34 12 a15 15 0 0 1 0 24', 'stroke', 3.5]],
  globe: [['M39 24 a15 15 0 1 0 -30 0 a15 15 0 1 0 30 0', 'stroke', 4], ['M9 24 H39 M24 9 c-7 8 -7 22 0 30 c7 -8 7 -22 0 -30', 'stroke', 3]],
  trash: [['M12 15 H36 L34 40 H14 Z', 'stroke', 4], ['M9 13 H39 M20 9 H28', 'stroke', 4]],
  book: [['M8 12 c6 -3 11 -3 16 1 c5 -4 10 -4 16 -1 V38 c-6 -3 -11 -3 -16 1 c-5 -4 -10 -4 -16 -1 Z', 'stroke', 4], ['M24 13 V38', 'stroke', 3]],
  gear: [['M31 24 a7 7 0 1 0 -14 0 a7 7 0 1 0 14 0', 'stroke', 4.5], ['M24 6 V12 M24 36 V42 M6 24 H12 M36 24 H42 M11 11 L15 15 M33 33 L37 37 M37 11 L33 15 M15 33 L11 37', 'stroke', 5]]
};
export const ICON_NAMES = Object.keys(ICON_PATHS);

function drawIcon(ctx, name, color) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [d, mode, w] of ICON_PATHS[name]) {
    const p = new Path2D(d);
    if (mode === 'fill') { ctx.fillStyle = color; ctx.fill(p); }
    else if (mode === 'whitefill') { ctx.fillStyle = '#FFFFFF'; ctx.fill(p); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(p); }
    else if (mode === 'dash') { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash([4, 4]); ctx.lineCap = 'butt'; ctx.stroke(p); ctx.setLineDash([]); ctx.lineCap = 'round'; }
    else { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(p); }
  }
}

// 키: icon_<이름>, icon_<이름>_dim(비활성), icon_<이름>_danger. 표시는 setScale(1/ART_SCALE) 로 48px.
export function bakeIcons(scene) {
  for (const name of ICON_NAMES) {
    bake(scene, `icon_${name}`, 48, 48, (ctx) => drawIcon(ctx, name, T.codeIcons.color));
    bake(scene, `icon_${name}_dim`, 48, 48, (ctx) => drawIcon(ctx, name, 'rgba(43,74,59,.45)'));
    bake(scene, `icon_${name}_danger`, 48, 48, (ctx) => drawIcon(ctx, name, T.palette.dangerText));
  }
}

// ---- 입자와 효과 텍스처 ----
export function bakeParticles(scene) {
  const P = T.themeParticles;
  // 테마 입자 6종 (theme.themeParticles)
  bake(scene, 'fx_dew_mote', 16, 16, (ctx) => {
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 6);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.33, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16);
  });
  bake(scene, 'fx_blossom', 20, 20, (ctx) => {
    ctx.translate(10, 10);
    ctx.beginPath(); ctx.ellipse(0, 0, 4, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = P.fx_blossom.color; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1.2, -7); ctx.lineTo(0, -4.8); ctx.lineTo(1.2, -7); ctx.strokeStyle = '#fff'; ctx.stroke();
  });
  bake(scene, 'fx_star_twinkle', 20, 20, (ctx) => {
    ctx.translate(10, 10);
    ctx.fillStyle = 'rgba(255,242,168,.25)'; ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 9; const a = -Math.PI / 2 + (i * Math.PI) / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fillStyle = P.fx_star_twinkle.color; ctx.fill();
  });
  bake(scene, 'fx_snow', 24, 24, (ctx) => {
    ctx.translate(12, 12); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      ctx.save(); ctx.rotate((i * Math.PI) / 3);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -10); ctx.moveTo(0, -6); ctx.lineTo(-3 * 0.8, -9); ctx.moveTo(0, -6); ctx.lineTo(3 * 0.8, -9); ctx.stroke(); ctx.restore();
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
  });
  P.fx_sprinkle.colors.forEach((col, i) => bake(scene, `fx_sprinkle${i}`, 16, 16, (ctx) => { ctx.fillStyle = col; roundRect(ctx, 1, 5.5, 14, 5, 2.5); ctx.fill(); }));
  bake(scene, 'fx_cloud_puff', 36, 36, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    for (const [x, r] of [[8, 8], [18, 11], [28, 8]]) { ctx.beginPath(); ctx.arc(x, 20, r, 0, Math.PI * 2); ctx.fill(); }
    roundRect(ctx, 2, 22, 32, 12, 6); ctx.fill();
  });
  // 효과용 작은 텍스처
  bake(scene, 'p_petal', 16, 16, (ctx) => { ctx.translate(8, 8); ctx.rotate(0.5); ctx.beginPath(); ctx.ellipse(0, 0, 4, 7, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFB0C8'; ctx.fill(); ctx.strokeStyle = '#E5779C'; ctx.lineWidth = 1; ctx.stroke(); });
  bake(scene, 'p_spark', 20, 20, (ctx) => { ctx.translate(10, 10); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(2.4, -2.4); ctx.lineTo(9, 0); ctx.lineTo(2.4, 2.4); ctx.lineTo(0, 9); ctx.lineTo(-2.4, 2.4); ctx.lineTo(-9, 0); ctx.lineTo(-2.4, -2.4); ctx.closePath(); ctx.fill(); });
  bake(scene, 'p_dust', 16, 16, (ctx) => { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(220,205,180,.6)'; ctx.lineWidth = 1.5; ctx.stroke(); });
  bake(scene, 'p_smoke', 24, 24, (ctx) => { const g = ctx.createRadialGradient(12, 12, 0, 12, 12, 11); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 24, 24); });
  bake(scene, 'p_heart', 20, 20, (ctx) => { ctx.translate(10, 10); ctx.fillStyle = '#FF7FA6'; ctx.beginPath(); ctx.moveTo(0, 7); ctx.bezierCurveTo(-12, -2, -6, -10, 0, -4); ctx.bezierCurveTo(6, -10, 12, -2, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); });
  bake(scene, 'p_shard', 16, 16, (ctx) => { ctx.fillStyle = '#E6F7FF'; ctx.strokeStyle = '#8FCBE6'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(8, 1); ctx.lineTo(14, 10); ctx.lineTo(7, 15); ctx.lineTo(2, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); });
  bake(scene, 'p_crumb', 12, 12, (ctx) => { ctx.fillStyle = '#9B6B45'; ctx.beginPath(); ctx.arc(6, 6, 4.5, 0, Math.PI * 2); ctx.fill(); });
  bake(scene, 'p_leaf', 16, 16, (ctx) => { ctx.translate(8, 8); ctx.rotate(-0.6); ctx.fillStyle = '#7FC07A'; ctx.beginPath(); ctx.ellipse(0, 0, 3.5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#4F8A55'; ctx.lineWidth = 1; ctx.stroke(); });
  bake(scene, 'p_drop', 16, 20, (ctx) => { ctx.translate(8, 11); ctx.fillStyle = '#8EDBFF'; ctx.strokeStyle = '#3AA7E0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -8); ctx.bezierCurveTo(4, -2, 6, 1, 6, 3); ctx.bezierCurveTo(6, 7, 3, 9, 0, 9); ctx.bezierCurveTo(-3, 9, -6, 7, -6, 3); ctx.bezierCurveTo(-6, 1, -4, -2, 0, -8); ctx.fill(); ctx.stroke(); });
  bake(scene, 'p_gold', 12, 12, (ctx) => { const g = ctx.createRadialGradient(6, 6, 0, 6, 6, 6); g.addColorStop(0, 'rgba(255,240,150,1)'); g.addColorStop(1, 'rgba(255,240,150,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 12, 12); });
  // 빛 번짐 (창문 빛, 가로등): 64px 방사형 흰색. 틴트 0xFFD27A + ADD
  bake(scene, 'glow64', 64, 64, (ctx) => { const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); });
  // 풀 칸 아래 접지 그림자 (판 위 물체와 정원 아이템)
  bake(scene, 'shadow_ellipse', 64, 28, (ctx) => {
    ctx.translate(32, 14); ctx.scale(1, 0.44);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
    g.addColorStop(0, 'rgba(43,74,59,.38)'); g.addColorStop(1, 'rgba(43,74,59,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
  });
  // 부드러운 사각 그림자: nineslice 로 늘려 UI 뒤에 깐다 (theme.shadow.ui 의 인상, 필터 없이)
  bake(scene, 'shadow_blob', 96, 96, (ctx) => {
    ctx.shadowColor = 'rgba(43,74,59,.4)'; ctx.shadowBlur = 12; ctx.shadowOffsetX = 1000;
    ctx.fillStyle = '#2B4A3B'; roundRect(ctx, 24 - 1000, 24, 48, 48, 14); ctx.fill();
  });
  // 동그란 점(별 점, 모트)
  bake(scene, 'dot', 8, 8, (ctx) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(4, 4, 3.5, 0, Math.PI * 2); ctx.fill(); });
  // 물방울 꼬리(F1)
  bake(scene, 'p_tail', 12, 12, (ctx) => { const g = ctx.createRadialGradient(6, 6, 0, 6, 6, 6); g.addColorStop(0, 'rgba(180,235,255,.95)'); g.addColorStop(1, 'rgba(180,235,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 12, 12); });
}

// ---- 알약 텍스처: 토스트, 말풍선, 칩, 리본 (ui-kit toast / bubble / chip / ribbon). nineslice 로 늘린다 ----
// 반환 정보는 PILLS[key] = { pad, slice }: 텍스처 가장자리의 그림자 여백(1x px)과 nineslice 모서리(1x px)
export const PILLS = {};
function pill(scene, key, o) {
  const pad = o.pad ?? 14;
  const h = o.h;
  const w = o.w ?? 128;
  PILLS[key] = { pad, slice: o.r + pad };
  bake(scene, key, w + pad * 2, h + pad * 2, (ctx) => {
    ctx.save();
    ctx.shadowColor = o.shadow || 'rgba(43,74,59,.3)';
    ctx.shadowBlur = o.shadowBlur ?? 12; ctx.shadowOffsetY = o.shadowY ?? 6;
    ctx.fillStyle = '#fff';
    roundRect(ctx, pad, pad, w, h, o.r);
    ctx.fill();
    ctx.restore();
    if (o.ring) { ctx.fillStyle = o.ring; roundRect(ctx, pad - 3, pad - 3, w + 6, h + 6, o.r + 3); ctx.fill(); }
    ctx.fillStyle = o.border || '#fff';
    roundRect(ctx, pad, pad, w, h, o.r);
    ctx.fill();
    const bw = o.bw ?? 4;
    ctx.fillStyle = vGrad(ctx, pad, pad + h, o.c0, o.c1);
    roundRect(ctx, pad + bw, pad + bw, w - bw * 2, h - bw * 2, Math.max(2, o.r - bw));
    ctx.fill();
    if (o.shine) { ctx.fillStyle = 'rgba(255,255,255,.18)'; roundRect(ctx, pad + 8, pad + 5, w - 16, h * 0.28, h * 0.14); ctx.fill(); }
  });
}
export function bakePills(scene) {
  pill(scene, 'toast_normal', { h: 48, r: 24, c0: '#FFFDF5', c1: '#FFF1CF', ring: '#8FD6B3', shadowY: 7, shadowBlur: 12 });
  pill(scene, 'toast_info', { h: 48, r: 24, c0: '#FFFDF5', c1: '#FFF1CF', ring: '#8CCBEA', shadowY: 7, shadowBlur: 12 });
  pill(scene, 'toast_warn', { h: 48, r: 24, c0: '#FFFDF5', c1: '#FFF1CF', ring: '#F29BB5', shadowY: 7, shadowBlur: 12 });
  pill(scene, 'bubble', { h: 64, r: 22, c0: '#FFFDF2', c1: '#FFF1C2', shadowY: 6, shadowBlur: 10 });
  pill(scene, 'chip_white', { h: 40, r: 20, c0: 'rgba(255,255,255,.78)', c1: 'rgba(255,255,255,.78)', shadowY: 3, shadowBlur: 6, shadow: 'rgba(43,74,59,.2)', bw: 3, pad: 10 });
  pill(scene, 'chip_gold', { h: 40, r: 20, c0: '#FFF6C4', c1: '#FFE07A', shadowY: 3, shadowBlur: 10, shadow: 'rgba(255,214,70,.75)', bw: 3, pad: 12 });
  pill(scene, 'chip_mint', { h: 40, r: 20, c0: '#E3F8EC', c1: '#B9EBD1', shadowY: 3, shadowBlur: 6, shadow: 'rgba(43,74,59,.2)', bw: 3, pad: 10 });
  pill(scene, 'chip_rose', { h: 40, r: 20, c0: '#FFEFF4', c1: '#FFD3E0', ring: '#F29BB5', shadowY: 3, shadowBlur: 6, shadow: 'rgba(43,74,59,.2)', bw: 3, pad: 10 });
  const grads = T.gradients;
  const rib = (k, g, ring) => pill(scene, `ribbon_${k}`, { h: 64, r: 32, c0: g.stops[0][0], c1: g.stops[1][0], ring: ring || T.palette.text, shadowY: 8, shadowBlur: 14, shine: true });
  rib('mint', grads.ribbonMint); rib('pink', grads.ribbonPink); rib('sky', grads.ribbonSky); rib('gold', grads.ribbonGold, T.palette.text);
  pill(scene, 'timebadge', { h: 44, r: 22, c0: 'rgba(255,255,255,.82)', c1: 'rgba(255,255,255,.82)', shadowY: 3, shadowBlur: 8, shadow: 'rgba(43,74,59,.25)', bw: 3, pad: 10 });
  pill(scene, 'timebadge_dark', { h: 44, r: 22, c0: 'rgba(32,42,84,.78)', c1: 'rgba(32,42,84,.78)', border: 'rgba(255,255,255,.75)', shadowY: 3, shadowBlur: 8, shadow: 'rgba(43,74,59,.25)', bw: 3, pad: 10 });
}

// ---- 챕터 배경: 하늘 + 먼 산 + 덤불 + 앞 잎 (theme.zones, 3층 구성은 모든 챕터가 같고 색만 바뀐다) ----
// 배경 층의 내용이 있는 세로 범위. 전체 화면(540x960)으로 구우면 대부분이 투명한데도 층마다 화면 전체를 그려서,
// 설정/스테이지 선택처럼 겹침이 많은 화면이 느렸다. 내용이 있는 띠만 구워 그리는 픽셀 수를 줄인다 (모양은 그대로).
// y: 화면 위에서의 시작, h: 높이. 경로 좌표의 최소/최대 y 에 여유를 두었다.
export const BG_CROP = { far: { y: 260, h: 300 }, mid: { y: 380, h: 150 }, front: { y: 790, h: 170 } };

export function bakeZone(scene, zone) {
  const z = T.zones[zone];
  const [g0, g1] = z.ground;
  bake(scene, `bg_sky_${zone}`, 540, 960, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 960);
    g.addColorStop(0, z.sky[0]); g.addColorStop(0.26, z.sky[1]); g.addColorStop(0.4, z.sky[2]); g.addColorStop(0.62, g0); g.addColorStop(1, g1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 540, 960);
  }, 1);
  bake(scene, `bg_far_${zone}`, 540, BG_CROP.far.h, (ctx) => {
    ctx.translate(0, -BG_CROP.far.y);
    ctx.globalAlpha = 0.55; ctx.fillStyle = z.far[1];
    ctx.fill(new Path2D('M-20 360 Q40 300 100 330 Q150 280 210 320 Q260 290 310 318 Q370 270 430 312 Q490 286 560 330 V520 H-20 Z'));
    ctx.globalAlpha = 0.75; ctx.fillStyle = z.far[0];
    ctx.fill(new Path2D('M-20 392 Q50 350 120 372 Q190 340 250 366 Q320 336 390 362 Q460 338 560 370 V560 H-20 Z'));
  }, 1);
  bake(scene, `bg_mid_${zone}`, 600, BG_CROP.mid.h, (ctx) => {
    ctx.translate(30, -BG_CROP.mid.y);
    ctx.fillStyle = z.hedge[0];
    ctx.fill(new Path2D('M-30 430 q30 -34 64 -6 q26 -30 60 -4 q30 -32 64 -2 q28 -30 62 -4 q30 -30 64 -2 q28 -28 62 -2 q30 -30 64 0 q24 -24 56 0 V500 H-30 Z'));
    ctx.globalAlpha = 0.55; ctx.fillStyle = z.hedge[1];
    ctx.fill(new Path2D('M-30 462 q40 -22 80 -4 q40 -22 84 -2 q40 -20 84 0 q40 -22 84 -2 q40 -20 84 0 q40 -22 84 -2 V520 H-30 Z'));
  }, 1);
  bake(scene, `bg_front_${zone}`, 600, BG_CROP.front.h, (ctx) => {
    ctx.translate(30, -BG_CROP.front.y);
    ctx.globalAlpha = 0.9; ctx.fillStyle = z.leaf;
    ctx.fill(new Path2D('M-10 930 q40 -70 96 -54 q-30 30 -48 70 Z'));
    ctx.fill(new Path2D('M550 920 q-44 -66 -98 -44 q30 26 46 66 Z'));
    ctx.globalAlpha = 0.72;
    ctx.fill(new Path2D('M-14 880 q24 -60 70 -66 q-12 34 -36 72 Z'));
    ctx.fill(new Path2D('M556 860 q-26 -56 -70 -58 q12 34 38 66 Z'));
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff';
    for (const [x, y] of [[40, 900], [500, 880]]) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
  }, 1);
}

// 챕터 텍스처를 지운다 (다른 챕터로 바꿀 때 메모리 정리)
export function dropZone(scene, zone) {
  for (const k of ['sky', 'far', 'mid', 'front']) {
    const key = `bg_${k}_${zone}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
  }
}

// 정원 하늘 그라데이션 4세트(새벽, 낮, 해 질 녘, 밤): theme.garden.periods 의 sky 두 색 (위 -> 아래, skyStop 0.72)
export function bakeGardenSky(scene) {
  for (const [p, v] of Object.entries(T.garden.periods)) {
    if (!v.sky || typeof v.sky === 'string') continue;
    bake(scene, `gsky_${p}`, 540, 960, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 960);
      g.addColorStop(0, v.sky[0]); g.addColorStop(T.garden.periods.skyStop, v.sky[1]); g.addColorStop(1, v.sky[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 540, 960);
    }, 1);
  }
}

// 메뉴의 잔디 타원(300x76, 흰 테두리 4px): grass_a@pastel 로 채우고 아래쪽에 안쪽 그림자를 준다
export function bakeOval(scene) {
  if (scene.textures.exists('menu_oval')) return;
  const src = scene.textures.get('grass_a@pastel').getSourceImage();
  bake(scene, 'menu_oval', 316, 96, (ctx) => {
    ctx.save();
    ctx.shadowColor = 'rgba(43,74,59,.28)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(158, 44, 154, 42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.ellipse(158, 44, 150, 38, 0, 0, Math.PI * 2); ctx.clip();
    for (let y = 0; y < 100; y += 80) for (let x = 4; x < 316; x += 80) ctx.drawImage(src, x - 4, y + 2 - 40, 80, 80);
    const g = ctx.createLinearGradient(0, 44, 0, 84); g.addColorStop(0, 'rgba(79,138,85,0)'); g.addColorStop(1, 'rgba(79,138,85,.35)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 316, 96);
    ctx.restore();
  });
}
