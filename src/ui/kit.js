// UI 키트 (design/ui-kit.json): 버튼, 둥근 버튼, 패널, 타일, 진행 막대, 칩, 리본, 토스트, 말풍선, 코인 알약, 배지, 팝업. 모든 화면이 이것만 쓴다.
// Kenney UI Pack 의 PNG 를 pastelize 로 구워(art.js bakeUi) nineslice 로 쓰고, 모서리는 원본 32px -> 화면 16px(정확히 2:1)로 맞춘다.
import { THEME } from '../theme.js';
import { toOverlay } from './clipview.js';
import { sfx } from '../audio.js';
import { ART_SCALE, PILLS, hexNum } from '../art.js';
import { t } from '../i18n/index.js';
import { hideAd } from '../ads.js';

const P = THEME.palette;
export const hex = hexNum;
export const FONT = 'Jua, sans-serif';
export const DEPTH = THEME.depth;
const MOTION = THEME.motionMs;
export const W = THEME.layout.baseWidthPx;
export const H = THEME.layout.baseHeightPx;

// 필터(그림자, 글로우)를 쓸지 여부. WebGL 이 아니면 자동으로 꺼진다.
let filtersOn = true;
export const setFilters = (v) => { filtersOn = v; };
export const filtersEnabled = () => filtersOn;

export function glow(obj, kind = 'gold') {
  if (!filtersOn || !obj || !obj.enableFilters) return null;
  const g = THEME.glow[kind];
  try {
    obj.enableFilters();
    return obj.filters.external.addGlow(hex(g.color), g.outerStrength, g.innerStrength);
  } catch (e) { filtersOn = false; return null; }
}
// 글로우를 필터 없이 그린다: glow64 그라데이션을 대상 뒤에 ADD로 깐다 (필터는 매 프레임 렌더 타깃을 거쳐 판 화면에서 렉의 원인이었다)
// 반환된 스프라이트는 호출한 쪽이 destroy 한다
export function glowSprite(scene, target, kind = 'gold') {
  const g = THEME.glow[kind];
  const s = scene.add.image(0, 0, 'glow64').setTint(hex(g.color)).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
  s.setDisplaySize(Math.max(target.displayWidth, target.displayHeight) * 1.4 + g.outerStrength * 8, Math.max(target.displayWidth, target.displayHeight) * 1.4 + g.outerStrength * 8);
  const parent = target.parentContainer;
  if (parent) { s.setPosition(target.x, target.y); parent.addAt(s, parent.getIndex(target)); }
  else { const c = target.getCenter(); s.setPosition(c.x, c.y).setDepth(target.depth - 0.01); }
  return s;
}
export function shadowFilter(obj, kind = 'ui') {
  if (!filtersOn || !obj || !obj.enableFilters) return obj;
  const s = THEME.shadow[kind];
  try {
    obj.enableFilters();
    obj.filters.external.addShadow(s.x, s.y, s.decay, s.power, hex(s.color), 6, s.intensity);
  } catch (e) { filtersOn = false; }
  return obj;
}

// ---- 텍스트 ----
// o: size, color, origin, originY, align, stroke(색), strokeW, shadowY, shadowColor, wrap, maxW(넘치면 글자 크기를 줄인다), minSize
export function text(scene, x, y, str, o = {}) {
  const size = o.size || THEME.fontSizesPx.body;
  const style = { fontFamily: FONT, fontSize: `${size}px`, color: o.color || P.text, align: o.align || 'center', resolution: 2 };
  if (o.stroke) { style.stroke = o.stroke; style.strokeThickness = o.strokeW || 6; }
  if (o.shadowY) style.shadow = { offsetX: 0, offsetY: o.shadowY, color: o.shadowColor || 'rgba(20,60,40,0.55)', blur: o.shadowBlur || 0, stroke: !!o.stroke, fill: true };
  if (o.wrap) style.wordWrap = { width: o.wrap, useAdvancedWrap: true };
  if (o.lineSpacing !== undefined) style.lineSpacing = o.lineSpacing;
  const tx = scene.add.text(x, y, str, style).setOrigin(o.origin === undefined ? 0.5 : o.origin, o.originY === undefined ? 0.5 : o.originY);
  if (o.maxW) fit(tx, o.maxW, o.minSize || 14);
  return tx;
}

// 글자 수가 달라져도(ko/en) UI 가 깨지지 않도록 폭에 맞춰 글자 크기를 줄인다.
export function fit(tx, maxW, minSize = 14) {
  let size = parseInt(tx.style.fontSize, 10);
  while (tx.width > maxW && size > minSize) { size -= 1; tx.setFontSize(size); }
  return tx;
}

// 보조 글자: 잉크색 + 흰 하이라이트 1px (버튼 라벨)
const labelOpts = (o) => ({ color: o.color || P.ink, shadowY: 1, shadowColor: 'rgba(255,255,255,.65)', ...o });

export const titleText = (scene, x, y, str, o = {}) => text(scene, x, y, str, {
  size: THEME.fontSizesPx.title, color: '#FFFFFF', stroke: P.text, strokeW: 10, shadowY: 7, shadowColor: P.text, ...o
});
// 배경 위에 직접 얹는 제목(heading): 흰 글자 + 진한 테두리
export const headingText = (scene, x, y, str, o = {}) => text(scene, x, y, str, {
  size: THEME.fontSizesPx.heading, color: '#FFFFFF', stroke: P.text, strokeW: 7, shadowY: 4, shadowColor: P.text, ...o
});

// ---- 이미지 ----
// 2배로 구운 텍스처를 1x 크기로 보이게 한다
export const img2 = (scene, x, y, key) => scene.add.image(x, y, key).setScale(1 / ART_SCALE);
export function icon(scene, name, size = 48, color = 'ink') {
  const key = color === 'ink' ? `icon_${name}` : `icon_${name}_${color}`;
  return scene.add.image(0, 0, key).setScale(size / 48 / ART_SCALE);
}
export function image(scene, key, size, x = 0, y = 0) {
  const im = scene.add.image(x, y, key);
  im.setScale(size / Math.max(im.width, im.height));
  return im;
}
// Kenney -dark 글리프는 순수 검정이라 잉크색 FILL 틴트로 그린다 (theme.tint.inkFill)
export function inkGlyph(scene, key, size, rot = 0) {
  const im = scene.add.image(0, 0, key);
  im.setScale(size / im.height);
  im.setTint(hex(THEME.tint.inkFill.color)).setTintMode(Phaser.TintModes.FILL);
  if (rot) im.setAngle(rot);
  return im;
}

// ---- nineslice ----
// 원본 PNG 의 모서리(32px 또는 24px)를 화면에서 bw px 로 보이게 배율을 맞춘다 (모서리 : 화면 = 2 : 1)
export function nine(scene, key, w, h, slice, bw) {
  const s = bw / slice;
  const n = scene.add.nineslice(0, 0, key, undefined, w / s, h / s, slice, slice, slice, slice);
  n.setScale(s);
  n.__s = s;
  return n;
}
export function resizeNine(n, w, h) { n.setSize(w / n.__s, h / n.__s); }

// 2배로 구운 알약 텍스처(PILLS)를 화면 크기(콘텐츠 w x h)로 늘린다. 그림자 여백이 포함된다
export function pillNine(scene, key, w, h) {
  const m = PILLS[key];
  const full = ART_SCALE;
  const tw = (w + m.pad * 2) * full;
  const th = (h + m.pad * 2) * full;
  const sl = m.slice * full;
  const n = scene.add.nineslice(0, 0, key, undefined, tw, th, sl, sl, sl, sl);
  n.setScale(1 / full);
  return n;
}

// 부드러운 그림자: shadow_blob 을 nineslice 로 늘려 UI 뒤에 깐다 (필터 없이 shadow.ui 의 인상). 콘텐츠 w x h 기준
export function shadowBlob(scene, w, h, kind = 'ui') {
  const s = THEME.shadow[kind];
  const pad = 24;
  const sl = 36 * ART_SCALE;
  const n = scene.add.nineslice(0, s.y, 'shadow_blob', undefined, (w + pad * 2) * ART_SCALE, (h + pad * 2) * ART_SCALE, sl, sl, sl, sl);
  n.setScale(1 / ART_SCALE);
  n.setAlpha(Math.min(1, s.intensity + 0.55));
  return n;
}

// ---- 패널 ----
// 그림자 + 회색 정사각 nineslice 를 담은 컨테이너. c.bg 가 nineslice 다. o.flat: 카드/줄 변형 (그림자 약하게)
export function panel(scene, x, y, w, h, o = {}) {
  const c = scene.add.container(x + (o.center ? 0 : w / 2), y + (o.center ? 0 : h / 2));
  if (o.shadow !== false) c.add(shadowBlob(scene, w, h, o.flat ? 'object' : 'ui'));
  const n = nine(scene, 'ui-grey-button-square-depth-flat', w, h, 32, o.bw || 16);
  c.add(n);
  c.bg = n; c.w = w; c.h = h;
  if (o.depth !== undefined) c.setDepth(o.depth);
  return c;
}

// ---- 버튼 ----
const COLORS = { primary: 'green', secondary: 'blue', neutral: 'grey', danger: 'grey' };
const baseKey = (color, shape) => `ui-${color}-button-${shape}-depth-flat`;
const faceKey = (color, shape, hover) => {
  const b = baseKey(color, shape);
  if (color === 'grey') return hover ? `${b}@hi` : b;
  return hover ? `${b}@pastelHi` : `${b}@pastel`;
};

// 공용 눌림 상태(kitStates): 호버 1.03, 누름 .94, 놓음 Back.easeOut, 비활성 = 회색 + 라벨 alpha .5 + 눌림 없음 + 탭은 흔들림
function kitInteractive(scene, c, o) {
  c.setSize(c.w, c.h);
  c.setInteractive({ useHandCursor: true });
  let hover = false;
  let pressed = false;
  const scaleTo = (s, ms, ease) => {
    scene.tweens.killTweensOf(c);
    scene.tweens.add({ targets: c, scale: s, duration: ms, ease });
  };
  c.on('pointerover', (p) => {
    if (c.disabledState || (p && p.wasTouch)) return;
    hover = true;
    if (c.setFace) c.setFace(true);
    if (!pressed) scaleTo(1.03, MOTION.buttonHover, THEME.easing.buttonHover);
  });
  c.on('pointerout', () => {
    hover = false;
    if (c.setFace && !c.disabledState) c.setFace(false);
    pressed = false;
    scaleTo(1, MOTION.buttonHover, THEME.easing.buttonHover);
  });
  c.on('pointerdown', () => {
    if (c.disabledState) return;
    pressed = true;
    scaleTo(0.94, MOTION.buttonPress, THEME.easing.buttonPress);
    if (o.onDown) o.onDown();
  });
  c.on('pointerup', () => {
    if (c.disabledState) { nudge(scene, c); sfx.blocked(); if (o.onDisabledClick) o.onDisabledClick(); return; }
    if (!pressed) return;
    pressed = false;
    scaleTo(hover ? 1.03 : 1, MOTION.buttonRelease, THEME.easing.buttonRelease);
    c.trigger();
  });
  // 누름/놓음 없이 같은 동작을 실행한다 (키보드 단축키용)
  c.trigger = () => {
    if (c.disabledState) { if (o.onDisabledClick) o.onDisabledClick(); return; }
    if (!o.onClick) return;
    if (o.sound !== false) (o.sound || sfx.click)();
    o.onClick();
  };
  // 펄스 윤곽 (F35, 힌트 팁): Graphics 둥근 사각 테두리 4px #FFF3B0 + 외곽 글로우, alpha .35 <-> 1 yoyo
  c.setPulse = (on, round) => {
    if (on && !c.pulseGfx) {
      const g = scene.add.graphics();
      const pad = 7;
      // 글로우 필터 대신 바깥쪽에 흐린 윤곽을 한 겹 더 그린다 (필터는 매 프레임 다시 그려 렉의 원인이었다)
      g.lineStyle(10, hex(THEME.glow.pulse.color), 0.25);
      if (round) g.strokeCircle(0, 0, c.w / 2 + pad + 3);
      else g.strokeRoundedRect(-c.w / 2 - pad - 3, -c.h / 2 - pad - 3, c.w + (pad + 3) * 2, c.h + (pad + 3) * 2, 26);
      g.lineStyle(4, hex(THEME.glow.pulse.color), 1);
      if (round) g.strokeCircle(0, 0, c.w / 2 + pad);
      else g.strokeRoundedRect(-c.w / 2 - pad, -c.h / 2 - pad, c.w + pad * 2, c.h + pad * 2, 22);
      c.addAt(g, 0);
      c.pulseGfx = g;
      c.pulseTween = scene.tweens.add({ targets: g, alpha: { from: 0.35, to: 1 }, duration: MOTION.pulse, yoyo: true, repeat: -1, ease: THEME.easing.pulse });
    } else if (!on && c.pulseGfx) {
      c.pulseTween.remove(); c.pulseGfx.destroy(); c.pulseGfx = null; c.pulseTween = null;
    }
    return c;
  };
  if (o.depth !== undefined) c.setDepth(o.depth);
}

// o: x, y(중심), w, h, variant(primary|secondary|neutral|danger), label, size(글자 크기), icon(텍스처 키), iconSize, code(코드 아이콘 이름), glyph(Kenney 글리프 키), col(아이콘 위 글자 아래),
//    bw(모서리 표시 두께), onClick, onDown, sound, disabled, maxW, depth, shape(rect|square)
export function button(scene, o) {
  const variant = o.variant || 'primary';
  const color = o.disabled ? 'grey' : COLORS[variant];
  const shape = o.shape || 'rectangle';
  const w = o.w || 174;
  const h = o.h || 84;
  const bw = o.bw || (h <= 62 ? 12 : 16);
  const c = scene.add.container(o.x, o.y);
  c.add(shadowBlob(scene, w, h));
  const bg = nine(scene, faceKey(color, shape, false), w, h, 32, bw);
  c.add(bg);
  c.bg = bg; c.variant = variant; c.w = w; c.h = h; c.shapeKey = shape;
  c.disabledState = !!o.disabled;
  const size = o.size || (h >= 100 ? THEME.fontSizesPx.buttonXL : h >= 80 ? THEME.fontSizesPx.button : h >= 64 ? THEME.fontSizesPx.buttonSmall : THEME.fontSizesPx.buttonXS);
  const labelColor = variant === 'danger' ? P.dangerText : P.ink;
  const label = text(scene, 0, 0, o.label || '', labelOpts({ size, color: labelColor, maxW: o.maxW || (w - 24), minSize: 16 }));
  c.add(label);
  c.label = label;
  let ic = null;
  if (o.icon) ic = image(scene, o.icon, o.iconSize || Math.min(44, h * 0.55));
  else if (o.code) ic = icon(scene, o.code, o.iconSize || Math.min(34, h * 0.45), variant === 'danger' ? 'danger' : 'ink');
  else if (o.glyph) ic = inkGlyph(scene, o.glyph, o.iconSize || Math.min(34, h * 0.45), o.glyphRot || 0);
  if (ic) c.add(ic);
  c.icon = ic;
  let ri = null;
  if (o.rightIcon) { ri = image(scene, o.rightIcon, o.rightSize || 32); ri.setPosition(w / 2 - 30, -3); c.add(ri); }
  c.rightIcon = ri;
  const dy = -3; // 글자는 가운데보다 3px 위 (깊이 밴드)
  const layout = () => {
    if (o.align === 'left') {
      let x = -w / 2 + 24;
      if (ic) { ic.setPosition(x + ic.displayWidth / 2, dy); x += ic.displayWidth + 12; }
      label.setOrigin(0, 0.5).setPosition(x, dy);
      return;
    }
    if (!ic) { label.setPosition(0, dy); return; }
    if (o.col) {
      ic.setPosition(0, -h * 0.18 + dy);
      label.setPosition(0, h * 0.24 + dy);
    } else {
      const gap = 10;
      const iw = ic.displayWidth;
      const total = iw + gap + label.width;
      ic.setPosition(-total / 2 + iw / 2, dy);
      label.setPosition(-total / 2 + iw + gap + label.width / 2, dy);
    }
  };
  layout();
  c.relayout = layout;
  c.setFace = (hover) => { bg.setTexture(faceKey(c.disabledState ? 'grey' : color, shape, hover)); };
  c.setLabel = (s) => { label.setText(s); fit(label, o.maxW || (w - 24), 16); layout(); return c; };
  c.setDisabled = (d) => {
    c.disabledState = d;
    bg.setTexture(faceKey(d ? 'grey' : color, shape, false));
    label.setAlpha(d ? 0.5 : 1);
    if (ic) { ic.setAlpha(d ? 0.5 : 1); if (d && ic.setTint && !ic.__ink) ic.setTint(0xcccccc); else if (!d && ic.clearTint && !ic.__ink) ic.clearTint(); }
    return c;
  };
  kitInteractive(scene, c, o);
  if (o.disabled) c.setDisabled(true);
  return c;
}

// 둥근 버튼(D-pad, 일시정지, 챕터 화살표): 이미지 한 장. icon 은 글리프 키(회전 가능) 또는 코드 아이콘 이름
// o: x, y(중심), size, variant, glyph(Kenney -dark), glyphRot, code, disabled, onClick
export function roundButton(scene, o) {
  const variant = o.variant || 'secondary';
  const color = o.disabled ? 'grey' : COLORS[variant];
  const size = o.size || 72;
  const c = scene.add.container(o.x, o.y);
  c.add(shadowBlob(scene, size - 6, size - 6));
  const bg = scene.add.image(0, 0, faceKey(color, 'round', false)).setDisplaySize(size, size);
  c.add(bg);
  let ic = null;
  if (o.glyph) ic = inkGlyph(scene, o.glyph, size * 0.42, o.glyphRot || 0);
  else if (o.code) ic = icon(scene, o.code, size * 0.55);
  if (ic) { ic.setPosition(0, -3); c.add(ic); }
  c.bg = bg; c.icon = ic; c.w = size; c.h = size; c.variant = variant;
  c.disabledState = !!o.disabled;
  c.setFace = (hover) => bg.setTexture(faceKey(c.disabledState ? 'grey' : color, 'round', hover));
  c.setDisabled = (d) => { c.disabledState = d; bg.setTexture(faceKey(d ? 'grey' : color, 'round', false)); if (ic) ic.setAlpha(d ? 0.5 : 1); return c; };
  kitInteractive(scene, c, { ...o, sound: o.sound });
  if (o.disabled) c.setDisabled(true);
  const base = c.setPulse;
  c.setPulse = (on) => base(on, true);
  return c;
}

// ---- 스테이지 타일 ----
// o: x, y(중심), state(cleared|open|locked), label, stars(0~3), perfect, need, onClick
export function tile(scene, o) {
  const size = 88;
  const color = o.state === 'cleared' ? 'green' : o.state === 'open' ? 'blue' : 'grey';
  const c = scene.add.container(o.x, o.y);
  c.add(shadowBlob(scene, size, size));
  const bg = nine(scene, faceKey(color, 'square', false), size, size, 32, 16);
  c.add(bg);
  c.bg = bg; c.w = size; c.h = size;
  if (o.state === 'locked') {
    c.add(image(scene, 'lock', 34, 0, -8));
    c.add(text(scene, 0, 24, o.label, { size: 20, color: P.ink, shadowY: 1, shadowColor: 'rgba(255,255,255,.7)' }).setAlpha(0.6));
  } else {
    c.add(text(scene, 0, -12, o.label, labelOpts({ size: 28 })));
    const stars = [];
    for (let i = 0; i < 3; i++) {
      const s = image(scene, i < (o.stars || 0) ? 'star_full' : 'star_empty', 22, (i - 1) * 22, 20);
      c.add(s); stars.push(s);
    }
    c.stars = stars;
  }
  c.disabledState = false;
  c.setFace = (hover) => bg.setTexture(faceKey(color, 'square', hover));
  kitInteractive(scene, c, { ...o, sound: o.state === 'locked' ? sfx.blocked : sfx.click });
  if (o.glowKind) c.glowFx = glow(c, o.glowKind);
  return c;
}

// ---- 진행 막대 (nineslice 평면: 트랙 회색, 채움 초록 @pastel, 금색 = 회색 x 0xFFE070) ----
export function progressBar(scene, x, y, w, o = {}) {
  const h = o.h || 26;
  const c = scene.add.container(x, y);
  const track = nine(scene, 'ui-grey-button-rectangle-flat', w, h, 24, 12);
  const fill = nine(scene, o.gold ? 'ui-grey-button-rectangle-flat' : 'ui-green-button-rectangle-flat@pastel', Math.max(h, 1), h, 24, 12);
  if (o.gold) fill.setTint(hex(THEME.tint.barGold));
  c.add([track, fill]);
  c.track = track; c.fill = fill; c.w = w; c.h = h; c.ratio = 0;
  c.setValue = (ratio) => {
    c.ratio = Phaser.Math.Clamp(ratio, 0, 1);
    const fw = Math.max(24, w * c.ratio);
    resizeNine(fill, fw, h);
    fill.setPosition(-w / 2 + fw / 2, 0);
    fill.setVisible(c.ratio > 0);
  };
  c.setGold = (g) => { fill.setTexture(g ? 'ui-grey-button-rectangle-flat' : 'ui-green-button-rectangle-flat@pastel'); if (g) fill.setTint(hex(THEME.tint.barGold)); else fill.clearTint(); };
  c.fillTo = (ratio, ms = MOTION.passBarFill) => {
    scene.tweens.killTweensOf(c.__proxy || {});
    const proxy = c.__proxy = { v: c.ratio };
    scene.tweens.add({ targets: proxy, v: ratio, duration: ms, ease: THEME.easing.passBarFill, onUpdate: () => c.setValue(proxy.v) });
  };
  c.setValue(o.value || 0);
  return c;
}

// ---- 칩, 리본, 토스트, 말풍선 (코드로 구운 알약) ----
// kind: white | gold | mint | rose. content: { text, icon(텍스처 키), iconSize, size }
export function chip(scene, x, y, str, o = {}) {
  const tx = text(scene, 0, -1, str, labelOpts({ size: o.size || 20, color: o.color || P.ink, maxW: o.maxW || 320, minSize: 14 }));
  let ic = null;
  if (o.icon) ic = image(scene, o.icon, o.iconSize || 26);
  const gap = 6;
  const inner = (ic ? ic.displayWidth + gap : 0) + tx.width;
  const w = Math.max(o.minW || 64, inner + 32);
  const h = o.h || 40;
  const c = scene.add.container(x, y);
  c.add(pillNine(scene, `chip_${o.kind || 'white'}`, w, h));
  if (ic) { ic.setPosition(-inner / 2 + ic.displayWidth / 2, 0); c.add(ic); }
  tx.setPosition((ic ? ic.displayWidth + gap : 0) / 2, -1);
  c.add(tx);
  c.label = tx; c.icon = ic; c.w = w; c.h = h;
  c.setSize(w, h);
  return c;
}

// 리본(챕터 배너, 퍼펙트, 패스 단계): kind mint|pink|sky|gold
export function ribbon(scene, x, y, str, o = {}) {
  const kind = o.kind || 'mint';
  const gold = kind === 'gold';
  const tx = text(scene, 0, -2, str, gold
    ? { size: o.size || 30, color: P.ink, shadowY: 1, shadowColor: 'rgba(255,255,255,.7)', maxW: o.maxW || 420, minSize: 16 }
    : { size: o.size || 30, color: '#FFFFFF', stroke: P.text, strokeW: 6, maxW: o.maxW || 420, minSize: 16 });
  const h = o.h || 64;
  const w = Math.max(o.minW || 120, tx.width + (o.padX || 68));
  const c = scene.add.container(x, y);
  c.add(pillNine(scene, `ribbon_${kind}`, w, h));
  c.add(tx);
  c.label = tx; c.w = w; c.h = h;
  return c;
}

// 토스트: 같은 장면의 이전 토스트는 지운다. kind normal|info|warn
export function toast(scene, str, o = {}) {
  const c = makeToast(scene, str, o);
  toOverlay(scene, c);
  return c;
}
function makeToast(scene, str, o) {
  if (scene.__toast && scene.__toast.active) scene.__toast.destroy();
  const y = o.y || 160;
  const tx = text(scene, 0, -1, str, { size: o.size || 22, color: P.ink, maxW: o.maxW || 470, minSize: 16 });
  const w = Math.max(96, tx.width + 44);
  const c = scene.add.container(W / 2, y + 16);
  c.add(pillNine(scene, `toast_${o.kind || 'normal'}`, w, 48));
  c.add(tx);
  c.setDepth(DEPTH.popup + 5).setAlpha(0);
  scene.__toast = c;
  const hold = o.ms || MOTION.toast;
  scene.tweens.add({ targets: c, y, alpha: 1, duration: MOTION.toastFade, ease: THEME.easing.toastFade });
  scene.tweens.add({ targets: c, alpha: 0, delay: hold, duration: MOTION.toastFade, onComplete: () => c.destroy() });
  return c;
}

// 말풍선 (guide). (x, y) 는 중심. tail: 'up' | 'down' | null. 입력을 막지 않는다
export function bubble(scene, x, y, w, h, str, o = {}) {
  const c = scene.add.container(x, y);
  const tail = o.tail === undefined ? 'down' : o.tail;
  if (tail) {
    const g = scene.add.graphics();
    const at = o.tailAt || 0;
    const sgn = tail === 'down' ? 1 : -1;
    const ey = sgn * h / 2;
    g.fillStyle(0xFFFFFF, 1).fillTriangle(at - 13, ey - sgn * 4, at + 13, ey - sgn * 4, at, ey + sgn * 15);
    g.fillStyle(tail === 'down' ? 0xFFF1C2 : 0xFFFDF2, 1).fillTriangle(at - 8, ey - sgn * 4, at + 8, ey - sgn * 4, at, ey + sgn * 8);
    c.add(g);
  }
  c.add(pillNine(scene, 'bubble', w, h));
  let size = o.size || 21;
  const tx = text(scene, 0, -1, str, { size, color: P.ink, wrap: w - 36 });
  while (tx.height > h - 14 && size > 14) { size -= 1; tx.setFontSize(size); }
  c.add(tx);
  c.label = tx;
  c.fadeIn = () => {
    c.setAlpha(0).setY(y + 4);
    scene.tweens.add({ targets: c, alpha: 1, y, duration: MOTION.guideFadeIn, ease: THEME.easing.guideFadeIn });
    return c;
  };
  c.fadeOut = (done) => {
    scene.tweens.killTweensOf(c);
    scene.tweens.add({ targets: c, alpha: 0, duration: MOTION.guideFadeOut, ease: THEME.easing.guideFadeOut, onComplete: () => { c.destroy(); if (done) done(); } });
    return c;
  };
  return c;
}

// ---- 코인 알약: 패널 + AI 코인 + 숫자 (S2, S3, S4, S6, S8, S9) ----
export function coinPill(scene, x, y, w, h, value) {
  const c = scene.add.container(x + w / 2, y + h / 2);
  c.add(panel(scene, 0, 0, w, h, { center: true, flat: true }));
  const cs = Math.round(h * 0.62);
  const coin = image(scene, 'coin', cs);
  const num = text(scene, 0, -2, String(value), { size: h >= 60 ? 28 : 26, color: P.text });
  c.add([coin, num]);
  c.coin = coin; c.num = num; c.value = value; c.w = w; c.h = h;
  const layout = () => {
    const total = cs + 8 + num.width;
    coin.setPosition(-total / 2 + cs / 2, 0);
    num.setPosition(-total / 2 + cs + 8 + num.width / 2, -2);
  };
  layout();
  c.setValue = (n) => { c.value = n; num.setText(String(n)); layout(); return c; };
  c.countTo = (n, ms = MOTION.coinCount) => {
    if (c.counter) c.counter.remove();
    const from = c.value;
    c.target = n;
    c.counter = scene.tweens.addCounter({ from, to: n, duration: ms, ease: THEME.easing.coinCount, onUpdate: (tw) => c.setValue(Math.round(tw.getValue())), onComplete: () => { c.counter = null; c.setValue(n); } });
    return c;
  };
  c.finish = () => { if (c.counter) { c.counter.remove(); c.counter = null; } if (c.target !== undefined) c.setValue(c.target); return c; };
  return c;
}

// "+N" / "-N" 숫자가 튀어오른다
export function coinPop(scene, x, y, str) {
  const tx = text(scene, x, y, str, { size: 30, color: '#FFFFFF', stroke: '#C98F00', strokeW: 7, shadowY: 4, shadowColor: '#C98F00' }).setDepth(DEPTH.popup + 6).setScale(0.6);
  scene.tweens.add({ targets: tx, scale: 1, duration: MOTION.coinPop, ease: THEME.easing.coinPop });
  scene.tweens.add({ targets: tx, y: y - 28, alpha: 0, delay: MOTION.coinPop + 300, duration: 300, onComplete: () => tx.destroy() });
  return tx;
}

// ---- 배지: 회색 둥근 x 분홍 MULTIPLY. 0 이면 회색 + 잉크 숫자 ----
export function badge(scene, x, y, n, size = 34) {
  const c = scene.add.container(x, y);
  const bg = scene.add.image(0, 0, 'ui-grey-button-round-depth-flat').setDisplaySize(size, size);
  const tx = text(scene, 0, -2, String(n), { size: Math.round(size * 0.58), color: '#FFFFFF', stroke: '#B24B73', strokeW: 4 });
  c.add([bg, tx]);
  c.bg = bg; c.num = tx; c.size = size;
  c.setCount = (v, animate = false, label) => {
    const zero = v <= 0;
    tx.setText(label !== undefined ? label : String(v));
    if (zero) { bg.clearTint(); tx.setColor(P.ink); tx.setStroke(P.ink, 0); } else { bg.setTint(hex(THEME.tint.badgePink)); tx.setColor('#FFFFFF'); tx.setStroke('#B24B73', 4); }
    if (animate) { scene.tweens.killTweensOf(c); c.setScale(1); scene.tweens.add({ targets: c, scale: 1.25, duration: MOTION.badgePop / 2, yoyo: true, ease: THEME.easing.badgePop }); }
    return c;
  };
  c.setPulse = (on) => {
    if (on && !c.pulse) c.pulse = scene.tweens.add({ targets: c, scale: { from: 1, to: 1.08 }, duration: MOTION.badgePulse, yoyo: true, repeat: -1, ease: THEME.easing.badgePulse });
    else if (!on && c.pulse) { c.pulse.remove(); c.pulse = null; c.setScale(1); }
    return c;
  };
  c.setCount(n);
  return c;
}

// 별 줄: 빨간 대신 AI 별 이미지 (star_full / star_empty)
export function starRow(scene, x, y, o = {}) {
  const count = o.count || 3;
  const size = o.size || 36;
  const gap = o.gap === undefined ? 8 : o.gap;
  const c = scene.add.container(x, y);
  const stars = [];
  for (let i = 0; i < count; i++) {
    const s = image(scene, 'star_full', size, (i - (count - 1) / 2) * (size + gap), 0);
    c.add(s); stars.push(s);
  }
  c.stars = stars;
  c.setFilled = (n) => { stars.forEach((s, i) => s.setTexture(i < n ? 'star_full' : 'star_empty')); return c; };
  c.setFilled(o.filled === undefined ? count : o.filled);
  return c;
}

// 좌우로 6px씩 두 번 떠는 공용 모션 (F4, F14, F22, F24, nudge 240ms)
export function nudge(scene, target) {
  const x0 = target.__nx === undefined ? target.x : target.__nx;
  target.__nx = x0;
  scene.tweens.killTweensOf(target);
  target.setX(x0);
  scene.tweens.add({ targets: target, x: { from: x0 - 6, to: x0 + 6 }, duration: MOTION.nudge / 4, yoyo: true, repeat: 1, ease: THEME.easing.nudge, onComplete: () => target.setX(x0) });
}

// 어두운 막 + 패널 팝업. 내용은 호출한 쪽이 api.add 로 얹는다
export function popup(scene, w, h, o = {}) {
  const cx = W / 2;
  const cy = o.y || H / 2;
  const dim = scene.add.rectangle(cx, H / 2, W, H, hex(P.ink), 1).setDepth(DEPTH.popup).setInteractive();
  const pn = panel(scene, cx, cy, w, h, { center: true, depth: DEPTH.popup + 1 });
  const items = [dim, pn];
  toOverlay(scene, dim); toOverlay(scene, pn);
  const api = {
    dim, panel: pn, items, cx, cy,
    add(obj) { obj.setDepth(DEPTH.popup + 2); items.push(obj); toOverlay(scene, obj); return obj; },
    close() { items.forEach((i) => i.destroy()); items.length = 0; }
  };
  dim.setAlpha(0);
  pn.setScale(0.9).setAlpha(0);
  scene.tweens.add({ targets: dim, alpha: 0.42, duration: 160 });
  scene.tweens.add({ targets: pn, scale: 1, alpha: 1, duration: MOTION.panelPop, ease: THEME.easing.panelPop });
  return api;
}

// 타이머 막대(12px): (x, y) 는 왼쪽 위. setRatio(0~1)
export function timerBar(scene, x, y, w) {
  const g = scene.add.graphics({ x, y });
  const draw = (r) => {
    g.clear();
    g.fillStyle(0x3B5B4A, 0.18).fillRoundedRect(0, 0, w, 12, 6);
    const fw = Math.max(0, w * Phaser.Math.Clamp(r, 0, 1));
    if (fw >= 12) {
      g.fillStyle(0xFFFFFF, 1).fillRoundedRect(0, 0, fw, 12, 6);
      g.fillStyle(0x5CC39A, 1).fillRoundedRect(2, 2, fw - 4, 8, 4);
      g.fillStyle(0xA3E8C6, 1).fillRoundedRect(2, 2, fw - 4, 4, 2);
    }
  };
  g.setRatio = (r) => { draw(r); return g; };
  draw(1);
  return g;
}

// 화면 전환(페이드 125ms + 125ms). 중복 호출을 막는다.
export function go(scene, key, data) {
  if (scene.__leaving) return;
  scene.__leaving = true;
  scene.events.once('shutdown', () => { scene.__leaving = false; });
  scene.cameras.main.fadeOut(MOTION.screenFade / 2, 205, 235, 197);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}
export const fadeIn = (scene) => {
  if (scene.scene.key !== 'Result') hideAd(scene.game); // 광고 영역은 결과 화면에서만 공간을 차지한다 (R15)
  scene.cameras.main.fadeIn(MOTION.screenFade / 2, 205, 235, 197);
};

export { t };
