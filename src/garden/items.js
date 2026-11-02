// 정원에 놓인 아이템 하나 (R36, R44, R47, plan 3-11, 3-12-5, 3-12-6): 바닥/장식 한 장, 건물 3상태(건설 중/낮/밤) + 겹침 레이어 + 창문 빛 + 굴뚝 연기.
// 컨테이너 하나가 이미지들을 담고, 위치와 scale 은 보기 변환(GardenView)이 정한다. 깡총, 흔들림, 눌림은 컨테이너에만 건다(자식은 alpha 만 바뀐다).
import { THEME } from '../theme.js';
import { CONFIG } from '../config.js';
import { ITEMS, DECOR_IDLE, LAMPS } from '../catalog.js';
import { bakeGardenTexture } from '../art.js';
import { sfx } from '../audio.js';
import { itemSpec, depthOf } from './geom.js';

const G = THEME.garden;
const M = THEME.motionMs;
const E = THEME.easing;
const hex = (s) => parseInt(s.slice(1), 16);
const PERIOD_TINT = { dawn: hex(THEME.tint.garden.dawn), day: 0xffffff, dusk: hex(THEME.tint.garden.dusk), night: hex(THEME.tint.garden.night) };
export const periodTint = (p) => PERIOD_TINT[p];
const BUILDING_PERIOD_TINT = { dawn: hex(THEME.tint.garden.dawn), day: 0xffffff, dusk: hex(THEME.tint.garden.dusk) };

// 굴뚝 연기 위치(256px 원본 기준): 정원사 오두막, 버섯 집, 다람쥐 나무집
const SMOKE = { b1_gardener_hut: [175, 33], b3_mushroom_house: [184, 37], b5_squirrel_house: [160, 30] };
// 건물/장식 위쪽 중앙의 반짝임 위치
const OVERLAYS = G.overlays;
const WINDOWS = G.windowLights.anchors;

const lerpColor = (a, b, k) => {
  const ar = (a >> 16) & 255; const ag = (a >> 8) & 255; const ab = a & 255;
  const br = (b >> 16) & 255; const bg = (b >> 8) & 255; const bb = b & 255;
  return (Math.round(ar + (br - ar) * k) << 16) | (Math.round(ag + (bg - ag) * k) << 8) | Math.round(ab + (bb - ab) * k);
};
export { lerpColor };

export class PlacedItem {
  // rec: { id, x, y, flip }. o: { view, period, fx(공용 입자 방출기), budget }
  constructor(scene, view, rec, o = {}) {
    this.scene = scene;
    this.view = view;
    this.rec = rec;
    this.item = ITEMS[rec.id];
    this.spec = itemSpec(this.item);
    this.period = o.period || 'day';
    this.fx = o.fx;
    this.bob = { y: 0, scale: 1, angle: 0 };
    this.tweens = [];
    this.emitters = [];
    this.constructing = false;
    this.selected = false;
    this.tintables = [];
    this.nightAlpha = 0;
    this.container = scene.add.container(0, 0);
    this.build();
    this.applyView();
  }

  get isBuilding() { return this.item.kind === 'building'; }
  get footprint() { const s = this.spec.size; const out = []; for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) out.push([this.rec.x + i, this.rec.y + j]); return out; }

  img(key, w, ratio, x = 0, y = 0) {
    const im = this.scene.add.image(x, y, key).setOrigin(0.5, ratio).setDisplaySize(w, w);
    this.container.add(im);
    return im;
  }

  build() {
    const sc = this.scene;
    const { w, ratio } = this.spec;
    const id = this.item.id;
    if (this.item.kind === 'ground') {
      this.base = this.img(bakeGardenTexture(sc, id, 'floor'), w, ratio);
      this.tintables.push(this.base);
    } else if (!this.isBuilding) {
      this.shadow = sc.add.image(0, -2, 'shadow_ellipse').setScale((w * 0.8) / 128).setAlpha(0.7);
      this.container.add(this.shadow);
      this.base = this.img(bakeGardenTexture(sc, id, 'day'), w, ratio);
      this.tintables.push(this.base);
      this.buildDecorExtras();
    } else {
      this.shadow = sc.add.image(0, -10, 'shadow_ellipse').setScale((w * 0.9) / 128).setAlpha(0.7);
      this.container.add(this.shadow);
      this.buildImg = this.img(bakeGardenTexture(sc, `${id}_build`, 'day'), w, ratio).setAlpha(0);
      this.dayImg = this.img(bakeGardenTexture(sc, `${id}_day`, 'day'), w, ratio);
      const nightKey = sc.textures.exists(`${id}_night`) ? bakeGardenTexture(sc, `${id}_night`, 'night') : null;
      this.nightImg = nightKey ? this.img(nightKey, w, ratio).setAlpha(0).setTint(hex(THEME.tint.nightBase)) : null;
      this.base = this.dayImg;
      this.buildBuildingExtras();
    }
    // 뒤집기
    if (this.rec.flip) this.container.scaleX = -1;
  }

  // 겹침 레이어 중심의 컨테이너 좌표 (원본 px 기준 pivot -> 지역 좌표)
  local(px, py, base) { const { w, ratio } = this.spec; return [(px / base - 0.5) * w, (py / base - ratio) * w]; }

  buildDecorExtras() {
    const sc = this.scene;
    const id = this.item.id;
    const idle = DECOR_IDLE[id];
    const { w, ratio } = this.spec;
    if (OVERLAYS[id]) { // 바람개비 날개
      const [key, px, py, size] = OVERLAYS[id];
      const [lx, ly] = this.local(px, py, 192);
      const ow = (size / 192) * w;
      this.overlay = this.img(bakeGardenTexture(sc, key.replace('images/ai/', '').replace('.webp', ''), 'day'), ow, 0.5, lx, ly);
      this.tintables.push(this.overlay);
      this.tweens.push(sc.tweens.add({ targets: this.overlay, angle: 360, duration: 360000 / (idle && idle.degPerS ? idle.degPerS : 90), repeat: -1, ease: 'Linear' }));
    }
    if (idle && (idle.kind === 'rot' || idle.kind === 'skewX')) {
      // 윗부분(top) 또는 발(foot) 기준점으로 흔들린다: 이미지를 기준점 컨테이너 안에 넣는다. skewX 는 이 렌더러에 없어 발 기준 기울임으로 대신한다
      const pivotY = idle.kind === 'rot' && idle.pivot === 'top' ? -ratio * w : 0;
      const swayDeg = idle.kind === 'skewX' ? idle.deg * 0.6 : idle.deg;
      const sway = sc.add.container(0, pivotY);
      this.container.remove(this.base);
      this.base.setPosition(0, -pivotY);
      sway.add(this.base);
      this.container.add(sway);
      this.sway = sway;
      sway.angle = -swayDeg;
      this.tweens.push(sc.tweens.add({ targets: sway, angle: swayDeg, duration: idle.ms / 2, yoyo: true, repeat: -1, ease: E.decorSway, delay: Math.random() * idle.ms }));
    } else if (idle && idle.kind === 'scale') {
      this.tweens.push(sc.tweens.add({ targets: this.base, scaleX: { from: this.base.scaleX, to: this.base.scaleX * idle.ratio }, scaleY: { from: this.base.scaleY, to: this.base.scaleY * idle.ratio }, duration: idle.ms / 2, yoyo: true, repeat: -1, ease: E.decorSway, delay: Math.random() * idle.ms }));
    } else if (idle && idle.kind === 'fireflies') {
      this.fireflies = [0, 1, 2].map((i) => {
        const d = sc.add.image((i - 1) * 8, -w * 0.45 + (i % 2) * 6, 'p_gold').setScale(0.9).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
        this.container.add(d);
        this.tweens.push(sc.tweens.add({ targets: d, y: d.y - 8, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 400 }));
        return d;
      });
    }
    if (LAMPS.includes(id)) {
      this.lamp = sc.add.image(0, (0.3 - ratio) * w, 'glow64').setTint(hex(G.lampGlow.color)).setBlendMode(Phaser.BlendModes.ADD).setScale((2 * G.lampGlow.radiusPx) / 64).setAlpha(0);
      this.container.add(this.lamp);
      this.lampPhase = Math.random();
    }
  }

  buildBuildingExtras() {
    const sc = this.scene;
    const id = this.item.id;
    const { w } = this.spec;
    const ov = OVERLAYS[id];
    if (ov) {
      const [key, px, py, size] = ov;
      const [lx, ly] = this.local(px, py, 256);
      const ow = (size / 256) * w;
      const k = key.replace('images/ai/', '').replace('.webp', '');
      this.overlay = this.img(bakeGardenTexture(sc, k, 'day'), ow, 0.5, lx, ly);
      this.overlay.setAlpha(0);
      this.tintables.push(this.overlay);
      this.overlayKind = id;
    }
    this.halos = [];
    for (const [wx, wy] of (WINDOWS[id] || [])) {
      const [lx, ly] = this.local(wx, wy, 256);
      const h = sc.add.image(lx, ly, 'glow64').setTint(hex(G.windowLights.color)).setBlendMode(Phaser.BlendModes.ADD).setScale((2 * G.windowLights.radiusPx) / 64).setAlpha(0);
      this.container.add(h);
      this.halos.push(h);
      h.flick = 1;
      h.phase = Math.random();
    }
    if (SMOKE[id]) {
      const [sx, sy] = SMOKE[id];
      const [lx, ly] = this.local(sx, sy, 256);
      this.smokeLocal = [lx, ly];
    }
  }

  // ---- 위치와 크기: 보기 변환 ----
  applyView() {
    const v = this.view;
    const vt = v.vertex(this.rec.x, this.rec.y);
    const wx = vt.x;
    const wy = vt.y + this.spec.footDy;
    const s = v.toScreen(wx, wy);
    const z = v.zoom;
    this.container.setPosition(s.x, s.y + this.bob.y * z);
    this.container.setScale((this.rec.flip ? -1 : 1) * z * this.bob.scale, z * this.bob.scale);
    this.container.setAngle(this.bob.angle);
    this.container.setDepth(depthOf(this.item, this.rec.x, this.rec.y) + (this.selected ? 0.3 : 0));
    this.screen = s;
    this.syncEmitters();
  }

  syncEmitters() {
    const z = this.view.zoom;
    if (this.smoke && this.smokeLocal) {
      const [lx, ly] = this.smokeLocal;
      const flip = this.rec.flip ? -1 : 1;
      this.smoke.setPosition(this.screen.x + lx * z * flip, this.screen.y + ly * z);
      this.smoke.setScale(z);
      this.smoke.setDepth(this.container.depth + 0.1);
      this.smoke.setVisible(z >= CONFIG.gardenZoomFarRatio + 0.01);
    }
  }

  // ---- 시간대 적용 ----
  // 장식/바닥/겹침 레이어 tint, 건물 낮/밤 이미지, 창문 빛, 가로등 빛
  setPeriod(p, ms = 0, delay = 0, instant = true) {
    const prev = this.period;
    this.period = p;
    const sc = this.scene;
    const night = p === 'night';
    if (!this.isBuilding) {
      // 장식, 바닥 tint 와 빛 번짐
      const from = this.tintNow !== undefined ? this.tintNow : PERIOD_TINT[prev];
      const to = PERIOD_TINT[p];
      this.tweenTint(from, to, instant ? 0 : ms);
      const la = G.lampGlow.alpha[p];
      if (this.lamp) { this.lampBase = la; if (instant) this.lamp.setAlpha(la ? la + 0.05 : 0); else sc.tweens.add({ targets: this.lamp, alpha: la ? la + 0.05 : 0, duration: ms, ease: E.skyFade }); }
      if (this.fireflies) this.fireflies.forEach((d) => { sc.tweens.add({ targets: d, alpha: night ? 1 : 0, duration: instant ? 1 : ms }); });
      return;
    }
    if (this.constructing) return; // 건설 중에는 _build 유지, 완공 때 그 시점의 시간대 이미지를 쓴다
    this.applyBuildingPeriod(p, ms, delay, instant);
  }

  tweenTint(from, to, ms) {
    if (this.tintTween) { this.tintTween.remove(); this.tintTween = null; }
    const apply = (c) => { this.tintNow = c; for (const im of this.tintables) im.setTint(c); };
    if (!ms) { apply(to); return; }
    const k = { v: 0 };
    this.tintTween = this.scene.tweens.add({ targets: k, v: 1, duration: ms, ease: E.skyFade, onUpdate: () => apply(lerpColor(from, to, k.v)), onComplete: () => { apply(to); this.tintTween = null; } });
  }

  applyBuildingPeriod(p, ms, delay, instant) {
    const sc = this.scene;
    const night = p === 'night' && !!this.nightImg;
    const dayTint = BUILDING_PERIOD_TINT[p] !== undefined ? BUILDING_PERIOD_TINT[p] : 0xffffff;
    const overlayTint = PERIOD_TINT[p];
    const setHalos = () => { this.updateHalos(); };
    if (instant) {
      this.killFade();
      this.dayImg.setTint(dayTint).setAlpha(night ? 0 : 1);
      if (this.nightImg) this.nightImg.setAlpha(night ? 1 : 0);
      this.nightAlpha = night ? 1 : 0;
      this.tintNow = overlayTint;
      if (this.overlay) { this.overlay.setTint(overlayTint).setAlpha(1); }
      setHalos();
      return;
    }
    // 낮 <-> 밤: 들어오는 이미지가 위에서 0 -> 1, 나가는 이미지는 1 로 아래에 두었다가 끝에서 숨긴다
    const wasNight = this.nightImg && this.nightImg.alpha > 0.5 && !this.nightFadeOut;
    this.killFade();
    const k = { v: 0 };
    if (night && !wasNight) {
      this.order(this.nightImg);
      this.nightImg.setAlpha(0);
      this.fadeTween = sc.tweens.add({ targets: k, v: 1, duration: ms, delay, ease: E.buildingFade, onUpdate: () => { this.nightImg.setAlpha(k.v); this.nightAlpha = k.v; setHalos(); }, onComplete: () => { this.dayImg.setAlpha(0); this.nightAlpha = 1; this.fadeTween = null; setHalos(); } });
      this.tintOverlay(overlayTint, ms, delay);
    } else if (!night && wasNight) {
      this.order(this.dayImg);
      this.dayImg.setTint(dayTint).setAlpha(0);
      this.fadeTween = sc.tweens.add({ targets: k, v: 1, duration: ms, delay, ease: E.buildingFade, onUpdate: () => { this.dayImg.setAlpha(k.v); this.nightAlpha = 1 - k.v; setHalos(); }, onComplete: () => { this.nightImg.setAlpha(0); this.nightAlpha = 0; this.fadeTween = null; setHalos(); } });
      this.tintOverlay(overlayTint, ms, delay);
    } else if (!night) {
      // 같은 _day 이미지의 색조만 바뀐다 (새벽 <-> 낮 <-> 해 질 녘)
      const from = this.dayImg.tintTopLeft;
      this.fadeTween = sc.tweens.add({ targets: k, v: 1, duration: ms, delay, ease: E.buildingFade, onUpdate: () => this.dayImg.setTint(lerpColor(from, dayTint, k.v)), onComplete: () => { this.dayImg.setTint(dayTint); this.fadeTween = null; } });
      this.tintOverlay(overlayTint, ms, delay);
    } else {
      this.tintOverlay(overlayTint, ms, delay);
    }
  }
  killFade() { if (this.fadeTween) { this.fadeTween.remove(); this.fadeTween = null; } }
  tintOverlay(to, ms, delay) {
    if (!this.overlay) return;
    const from = this.overlay.tintTopLeft;
    const k = { v: 0 };
    this.scene.tweens.add({ targets: k, v: 1, duration: ms, delay, ease: E.buildingFade, onUpdate: () => this.overlay.setTint(lerpColor(from, to, k.v)), onComplete: () => this.overlay.setTint(to) });
  }
  // 두 기본 이미지의 위아래 순서: top 이 위. 그 위에 겹침 레이어, 빛이 온다
  order(top) {
    const c = this.container;
    const idx = Math.max(c.getIndex(this.dayImg), this.nightImg ? c.getIndex(this.nightImg) : 0, c.getIndex(this.buildImg));
    c.moveTo(top, idx);
  }
  // 창문 빛 alpha = nightVisibility x 0.38 x 깜빡임
  updateHalos() {
    if (!this.halos) return;
    const base = G.windowLights.glowAlpha;
    for (const h of this.halos) h.setAlpha(this.constructing ? 0 : this.nightAlpha * base * (this.haloActive === false ? 0.75 / 1 : h.flick));
  }

  // ---- 대기 움직임 (완공 뒤 계속): 굴뚝 연기, 날개, 바퀴, 풍향계, 깃발, 창문 깜빡임, 그네/텃밭 숨쉬기 ----
  startIdle() {
    if (!this.isBuilding || this.idleStarted) return;
    this.idleStarted = true;
    const sc = this.scene;
    const id = this.item.id;
    const add = (tw) => { this.tweens.push(tw); return tw; };
    if (this.overlay) {
      if (id === 'b2_windmill') add(sc.tweens.add({ targets: this.overlay, angle: 360, duration: 360000 / CONFIG.bladeSpinDegPerS, repeat: -1, ease: 'Linear' }));
      else if (id === 'b4_water_mill') add(sc.tweens.add({ targets: this.overlay, angle: 360, duration: 360000 / CONFIG.wheelSpinDegPerS, repeat: -1, ease: 'Linear' }));
      else if (id === 'b5_wind_tower') { this.overlay.angle = -CONFIG.vaneSwingDeg; add(sc.tweens.add({ targets: this.overlay, angle: CONFIG.vaneSwingDeg, duration: CONFIG.vaneSwingMs / 2, yoyo: true, repeat: -1, ease: E.vaneSwing })); }
      else { this.overlay.angle = -CONFIG.flagSwayDeg; add(sc.tweens.add({ targets: this.overlay, angle: CONFIG.flagSwayDeg, duration: CONFIG.flagSwayMs / 2, yoyo: true, repeat: -1, ease: E.flagSway })); }
    }
    if (id === 'b1_veggie_patch') add(sc.tweens.add({ targets: this.container, scaleY: { from: this.container.scaleY, to: this.container.scaleY * 1.015 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', paused: false }));
    if (id === 'b3_tree_swing') { this.sway2 = true; add(sc.tweens.add({ targets: this.bob, angle: { from: -2, to: 2 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onUpdate: () => this.applyView() })); }
    if (SMOKE[id] && this.fx) {
      this.smoke = sc.add.particles(0, 0, 'p_smoke', {
        lifespan: CONFIG.smokeLifeMs, speedY: { min: -CONFIG.smokeRisePx / (CONFIG.smokeLifeMs / 1000) - 2, max: -CONFIG.smokeRisePx / (CONFIG.smokeLifeMs / 1000) + 2 }, speedX: { min: 2, max: 4 },
        scale: { start: 0.4, end: 1.0 }, alpha: { start: 0.5, end: 0 }, frequency: CONFIG.smokeIntervalMs, quantity: 1, maxAliveParticles: CONFIG.smokeMaxPerChimneyCount
      });
      this.emitters.push(this.smoke);
      this.syncEmitters();
    }
    if (this.halos && this.halos.length) this.startFlicker();
    this.idleActive = true;
  }

  // 창문 빛: 1200~3200ms 무작위 주기로 0.75 <-> 1.0, 17% 확률로 0.5 까지 내려간다
  startFlicker() {
    const sc = this.scene;
    for (const h of this.halos) {
      const cycle = () => {
        if (!h.scene) return;
        const period = Phaser.Math.Between(CONFIG.windowFlickerMinMs, CONFIG.windowFlickerMaxMs);
        const dim = Math.random() * 100 < CONFIG.windowDimChancePct;
        const target = dim ? 0.5 : (h.flick > 0.87 ? 0.75 : 1.0);
        const tw = sc.tweens.add({ targets: h, flick: target, duration: period / 2, ease: 'Sine.easeInOut', onUpdate: () => this.updateHalos(), onComplete: () => { if (h.scene) cycle(); } });
        h.cycleTween = tw;
        this.tweens.push(tw);
      };
      h.flick = 0.75 + Math.random() * 0.25;
      sc.time.delayedCall(Math.random() * 1000, cycle);
    }
  }

  // 동시 애니메이션 상한: active=false 면 중립 자세로 멈춘다 (R46)
  setAnimActive(active) {
    if (this.animActive === active) return;
    this.animActive = active;
    for (const tw of this.tweens) { try { if (active) tw.resume(); else tw.pause(); } catch (e) { /* 이미 끝남 */ } }
    for (const em of this.emitters) { try { if (active) em.start(); else em.stop(); } catch (e) { /* 무시 */ } }
    if (this.halos) { this.haloActive = active; this.updateHalos(); }
    if (!active && this.overlay && !this.constructing && this.overlayKind !== 'b5_wind_tower') this.overlay.angle = 0;
  }

  setParticlesOff(off) { for (const em of this.emitters) { try { if (off) em.stop(); else em.start(); } catch (e) { /* 무시 */ } } }

  // ---- 건설 연출 (R44, F46, F47): 보관함에서 놓을 때만, 총 3000ms ----
  startBuild(onDone, onDustPos) {
    const sc = this.scene;
    const c = this.container;
    this.constructing = true;
    this.buildImg.setAlpha(1);
    this.dayImg.setAlpha(0);
    if (this.nightImg) this.nightImg.setAlpha(0);
    if (this.overlay) this.overlay.setAlpha(0);
    this.nightAlpha = 0; this.updateHalos();
    this.bob.angle = 0;
    const shake = sc.tweens.add({ targets: this.bob, angle: { from: -CONFIG.buildShakeAngleDeg, to: CONFIG.buildShakeAngleDeg }, duration: CONFIG.buildShakePeriodMs / 2, yoyo: true, repeat: -1, ease: E.buildShakePeriod, onUpdate: () => this.applyView() });
    const dust = sc.time.addEvent({ delay: CONFIG.buildDustIntervalMs, loop: true, callback: () => { if (this.fx && this.fx.dust) { const corner = Phaser.Math.Between(0, 3); const dx = [-50, 50, -22, 22][corner] * this.view.zoom; const dy = [-14, -14, 8, 8][corner] * this.view.zoom; this.fx.dust.explode(1, this.screen.x + dx, this.screen.y + dy); } } });
    const tock = sc.time.addEvent({ delay: CONFIG.buildTockIntervalMs, loop: true, callback: () => sfx.constructTock() });
    sfx.constructTock();
    const stopAt = CONFIG.buildDurationMs - M.buildFade - 60; // 2640
    sc.time.delayedCall(stopAt, () => {
      shake.remove(); dust.remove(); tock.remove();
      sc.tweens.add({ targets: this.bob, angle: 0, duration: M.buildShakeStop, ease: E.buildShakeStop, onUpdate: () => this.applyView() });
    });
    // 2700ms: _build 1 -> 0 과 현재 시간대 이미지 0 -> 1 을 300ms 크로스페이드, 겹침 레이어와 창문 빛이 함께 나타난다
    sc.time.delayedCall(stopAt + 60, () => {
      const p = this.period;
      const night = p === 'night' && !!this.nightImg;
      const incoming = night ? this.nightImg : this.dayImg;
      if (!night) this.dayImg.setTint(BUILDING_PERIOD_TINT[p] !== undefined ? BUILDING_PERIOD_TINT[p] : 0xffffff);
      this.order(incoming);
      const k = { v: 0 };
      sc.tweens.add({ targets: k, v: 1, duration: M.buildFade, ease: E.buildFade, onUpdate: () => { this.buildImg.setAlpha(1 - k.v); incoming.setAlpha(k.v); if (this.overlay) this.overlay.setAlpha(k.v); this.nightAlpha = night ? k.v : 0; const was = this.constructing; this.constructing = false; this.updateHalos(); this.constructing = was; } });
      if (this.overlay) { this.overlay.setTint(PERIOD_TINT[p]); }
    });
    // 3000ms: 12px 튀어오름 (위 160ms Quad.easeOut, 아래 190ms Bounce.easeOut), 반짝임 8개, 완공음
    sc.time.delayedCall(CONFIG.buildDurationMs, () => {
      this.constructing = false;
      this.buildImg.setAlpha(0);
      const night = this.period === 'night' && !!this.nightImg;
      if (night) this.dayImg.setAlpha(0); else if (this.nightImg) this.nightImg.setAlpha(0);
      this.nightAlpha = night ? 1 : 0; this.updateHalos();
      sc.tweens.add({ targets: this.bob, y: -CONFIG.buildHopPx, duration: M.buildHopUp, ease: E.buildHopUp, onUpdate: () => this.applyView(), onComplete: () => sc.tweens.add({ targets: this.bob, y: 0, duration: M.buildHopDown, ease: E.buildHopDown, onUpdate: () => this.applyView(), onComplete: () => this.applyView() }) });
      if (this.fx && this.fx.spark) this.fx.spark.explode(CONFIG.buildSparkleCount, this.screen.x, this.screen.y - 70 * this.view.zoom);
      sfx.constructDone();
    });
    // 3350ms: 대기 움직임 시작, 3750ms: 밤 안내 확인 시점
    sc.time.delayedCall(CONFIG.buildDurationMs + 350, () => { this.startIdle(); if (this.budgetPaused) this.setAnimActive(false); });
    sc.time.delayedCall(CONFIG.buildDurationMs + 750, () => { if (onDone) onDone(); });
  }

  // 건설 중 건물 탭 (F48): scale 1 -> 1.03 -> 1 (100ms)
  tapBuilding() {
    this.scene.tweens.add({ targets: this.bob, scale: 1.03, duration: M.buildTapPop / 2, yoyo: true, ease: E.buildTapPop, onUpdate: () => this.applyView(), onComplete: () => { this.bob.scale = 1; this.applyView(); } });
  }

  setSelected(s) {
    this.selected = s;
    this.applyView();
    if (s && !this.selGlow) {
      try { this.container.enableFilters(); this.selGlow = this.container.filters.external.addGlow(0xffffff, 6, 0); } catch (e) { this.selGlow = null; }
    } else if (!s && this.selGlow) { try { this.container.filters.external.remove(this.selGlow); } catch (e) { /* 무시 */ } this.selGlow = null; }
  }

  destroy() {
    for (const tw of this.tweens) { try { tw.remove(); } catch (e) { /* 무시 */ } }
    this.killFade();
    for (const em of this.emitters) { try { em.destroy(); } catch (e) { /* 무시 */ } }
    this.container.destroy();
  }
}
