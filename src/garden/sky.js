// 정원 하늘 (R45, plan 3-10, 3-12-7): 시간대별 그라데이션 4세트 크로스페이드 3000ms, 해/달, 구름 3개(8px/초 흐름), 밤 별 24개.
import { THEME } from '../theme.js';
import { CONFIG } from '../config.js';
import { bake, bakeGardenSky } from '../art.js';
import { limits } from '../perf.js';
import { lerpColor } from './items.js';

const G = THEME.garden;
const M = THEME.motionMs;
const E = THEME.easing;
const hex = (s) => parseInt(s.slice(1), 16);
const STAR_PTS = [[40, 230], [92, 300], [150, 210], [210, 260], [270, 200], [330, 250], [470, 280], [500, 210], [120, 380], [440, 360], [30, 420], [510, 430], [250, 330], [380, 190], [180, 470], [360, 450], [60, 520], [490, 520], [300, 410], [420, 240], [90, 170], [230, 160], [310, 300], [140, 560]];
const CLOUDS = G.periods.clouds; // [x, y, w]
const SKY_DEPTH = 0;

export class GardenSky {
  constructor(scene, period) {
    this.scene = scene;
    this.period = period;
    bakeGardenSky(scene);
    this.skies = {};
    for (const p of ['dawn', 'day', 'dusk', 'night']) {
      this.skies[p] = scene.add.image(270, 480, `gsky_${p}`).setDepth(SKY_DEPTH).setAlpha(p === period ? 1 : 0);
    }
    // 해/달
    const P = G.periods;
    this.sun = scene.add.image(0, 0, 'sun').setDepth(SKY_DEPTH + 2);
    this.moonGlow = scene.add.image(0, 0, 'glow64').setTint(0xFFF0B4).setBlendMode(Phaser.BlendModes.ADD).setScale(2.4).setDepth(SKY_DEPTH + 2).setAlpha(0);
    this.moon = scene.add.image(0, 0, 'moon').setDepth(SKY_DEPTH + 2);
    this.sunNow = null;
    this.placeSun(period, 0);
    // 구름 3개
    this.clouds = CLOUDS.map(([x, y, w]) => {
      const h = Math.round((w * 171) / 256);
      const c = scene.add.image(x + w / 2, y + h / 2, 'cloud').setDisplaySize(w, h).setDepth(SKY_DEPTH + 3);
      c.w = w;
      return c;
    });
    this.cloudTint = null;
    this.applyCloudTint(period, 0);
    // 별
    const n = STAR_PTS.length;
    this.stars = STAR_PTS.map(([x, y], i) => {
      const s = scene.add.image(x, y, 'dot').setScale(((i % 3 ? 1.6 : 2.4) * 2) / 8 / 2 + 0.2).setDepth(SKY_DEPTH + 4).setAlpha(0);
      s.k = 0.4 + Math.random() * 0.6;
      s.fade = 0;
      scene.tweens.add({ targets: s, k: { from: 0.4, to: 1 }, duration: Phaser.Math.Between(M.starTwinkleMin, M.starTwinkleMax), yoyo: true, repeat: -1, ease: E.starTwinkleMin, delay: Math.random() * 2000 });
      return s;
    });
    this.starCount = 0;
    this.onUpdate = (t, dt) => {
      for (let i = 0; i < this.stars.length; i++) { const s = this.stars[i]; s.setAlpha(s.fade * s.k); }
      for (const c of this.clouds) { c.x += (8 * dt) / 1000; if (c.x - c.w / 2 > 560) c.x = -c.w / 2 - 10; }
    };
    scene.events.on('update', this.onUpdate);
    scene.events.once('shutdown', () => scene.events.off('update', this.onUpdate));
    this.setStarCount(this.targetStars(period), 0);
  }

  targetStars(p, minutes) {
    if (p === 'night') return limits().stars;
    return 0;
  }

  placeSun(p, ms) {
    const P = G.periods[p];
    const sc = this.scene;
    const cfg = P.sun || P.moon;
    const showSun = !!P.sun;
    const showMoon = !!P.moon;
    const to = { x: cfg.x + cfg.size / 2, y: cfg.y + cfg.size / 2, size: cfg.size };
    const a = showSun ? (P.sun.alpha ?? 1) : 0;
    if (!ms) {
      this.sun.setPosition(to.x, to.y).setDisplaySize(to.size, to.size).setAlpha(showSun ? a : 0);
      if (showMoon) { this.moon.setPosition(to.x, to.y).setDisplaySize(to.size, to.size).setAlpha(1); this.moonGlow.setPosition(to.x, to.y).setAlpha(0.7); } else { this.moon.setAlpha(0); this.moonGlow.setAlpha(0); }
      if (!showSun && !showMoon) this.sun.setAlpha(0);
      this.sunNow = { x: this.sun.x, y: this.sun.y, size: this.sun.displayWidth };
      return;
    }
    if (showSun) {
      sc.tweens.add({ targets: this.sun, x: to.x, y: to.y, alpha: a, displayWidth: to.size, displayHeight: to.size, duration: ms, ease: E.skyFade });
      sc.tweens.add({ targets: [this.moon, this.moonGlow], alpha: 0, duration: ms, ease: E.skyFade });
    } else {
      sc.tweens.add({ targets: this.sun, alpha: 0, duration: ms, ease: E.skyFade });
      this.moon.setPosition(to.x, to.y).setDisplaySize(to.size, to.size);
      this.moonGlow.setPosition(to.x, to.y);
      sc.tweens.add({ targets: this.moon, alpha: 1, duration: ms, ease: E.skyFade });
      sc.tweens.add({ targets: this.moonGlow, alpha: 0.7, duration: ms, ease: E.skyFade });
    }
  }

  applyCloudTint(p, ms) {
    const night = p === 'night';
    const col = night ? hex(THEME.tint.cloudNight.color) : (p === 'dawn' ? hex(THEME.tint.garden.dawn) : p === 'dusk' ? hex(THEME.tint.garden.dusk) : 0xffffff);
    const alpha = night ? THEME.tint.cloudNight.alpha : 0.92;
    const from = this.cloudTint === null ? col : this.cloudTint;
    this.cloudTint = col;
    if (!ms) { this.clouds.forEach((c) => { c.setTint(col); c.setAlpha(alpha); }); return; }
    const k = { v: 0 };
    this.scene.tweens.add({ targets: k, v: 1, duration: ms, ease: E.skyFade, onUpdate: () => this.clouds.forEach((c) => c.setTint(lerpColor(from, col, k.v))) });
    this.scene.tweens.add({ targets: this.clouds, alpha, duration: ms, ease: E.skyFade });
  }

  setStarCount(n, ms) {
    this.starCount = n;
    this.stars.forEach((s, i) => {
      const on = i < n ? 1 : 0;
      if (!ms) { s.fade = on; return; }
      this.scene.tweens.add({ targets: s, fade: on, duration: ms, ease: E.skyFade });
    });
  }

  // 시간대를 바꾼다. ms=0 이면 즉시 (진입, 저장 복원), 아니면 3000ms 크로스페이드
  setPeriod(p, ms, starCount) {
    const prev = this.period;
    this.period = p;
    const sc = this.scene;
    for (const k of Object.keys(this.skies)) {
      const im = this.skies[k];
      sc.tweens.killTweensOf(im);
      if (!ms) { im.setAlpha(k === p ? 1 : 0); continue; }
      // 새 하늘이 위에서 0 -> 1, 나머지는 1 로 두었다가 끝에서 숨긴다
      if (k === p) { im.setDepth(SKY_DEPTH + 0.5).setAlpha(0); sc.tweens.add({ targets: im, alpha: 1, duration: ms, ease: E.skyFade }); }
      else if (k === prev) { im.setDepth(SKY_DEPTH).setAlpha(1); sc.time.delayedCall(ms + 20, () => { if (this.period !== k) im.setAlpha(0); }); }
      else im.setAlpha(0);
    }
    this.placeSun(p, ms);
    this.applyCloudTint(p, ms);
    this.setStarCount(starCount !== undefined ? starCount : this.targetStars(p), ms);
  }
}
