// 배경 (2-2, theme.zones): 하늘 + 먼 산 + 덤불(x ±6px 12000ms) + 앞 잎(x ±10px 9000ms) + 구름 + 떠다니는 입자.
// 보드 테마(R39)를 적용하면 하늘 색과 입자만 바뀐다 (칸 요소 그림은 불변).
import { THEME } from '../theme.js';
import { bake, bakeZone, dropZone, hexNum, BG_CROP } from '../art.js';
import { appliedTheme } from '../save.js';
import { limits } from '../perf.js';

const M = THEME.motionMs;
// 메모리: 챕터 배경 텍스처는 최근 2개 챕터만 둔다
const liveZones = [];

// 테마 입자 설정 (plan 3-12-8). 값은 plan 표를 그대로 쓴다
function emitterConfig(themeId, zoneMote, lim) {
  const n = (v) => Math.max(1, Math.round(v * lim.themeScale));
  switch (themeId) {
    case 'theme_blossom':
      return { key: 'fx_blossom', cfg: { x: { min: 0, max: 540 }, y: -20, speedY: { min: 20, max: 28 }, speedX: { min: -10, max: 10 }, lifespan: 14000, rotate: { start: 0, end: 360, ease: 'Linear' }, scale: { min: 0.7, max: 1.1 }, frequency: 14000 / n(12), quantity: 1, maxAliveParticles: n(12), advance: 9000 } };
    case 'theme_starnight':
      return { key: 'fx_star_twinkle', cfg: { x: { min: 10, max: 530 }, y: { min: 20, max: 520 }, speed: 0, lifespan: { min: 1500, max: 3000 }, alpha: { start: 0.3, end: 1, ease: 'Sine.easeInOut' }, yoyo: true, scale: { min: 0.6, max: 1.0 }, frequency: 2200 / n(12), quantity: 1, maxAliveParticles: n(12), advance: 3000 } };
    case 'theme_snowflake':
      return { key: 'fx_snow', cfg: { x: { min: 0, max: 540 }, y: -20, speedY: { min: 26, max: 34 }, speedX: { min: -8, max: 8 }, lifespan: 12000, scale: { min: 0.6, max: 1 }, frequency: 12000 / n(14), quantity: 1, maxAliveParticles: n(14), advance: 8000 } };
    case 'theme_candy':
      return { key: ['fx_sprinkle0', 'fx_sprinkle1', 'fx_sprinkle2'], cfg: { x: { min: 0, max: 540 }, y: -20, speedY: { min: 18, max: 22 }, lifespan: 15000, rotate: { start: 0, end: 360 * 3, ease: 'Linear' }, frequency: 15000 / n(10), quantity: 1, maxAliveParticles: n(10), advance: 10000 } };
    case 'theme_rainbowcloud':
      return { key: 'fx_cloud_puff', cfg: { x: -30, y: { min: 60, max: 520 }, speedX: { min: 9, max: 11 }, speedY: 0, lifespan: 60000, scale: { start: 0.8, end: 1.0, ease: 'Sine.easeInOut' }, alpha: 0.85, frequency: 60000 / n(6), quantity: 1, maxAliveParticles: n(6), advance: 20000 } };
    default:
      return { key: 'fx_dew_mote', cfg: { x: { min: 20, max: 520 }, y: { min: 480, max: 900 }, speedY: { min: -14, max: -10 }, speedX: 0, lifespan: 4000, alpha: { start: 0.9, end: 0, ease: 'Quad.easeIn' }, scale: { min: 0.7, max: 1.3 }, tint: hexNum(zoneMote), frequency: 4000 / n(8), quantity: 1, maxAliveParticles: n(8), advance: 4000 } };
  }
}

export class Backdrop {
  // o: zone(1~5), clouds([[x, y, w]]), motes(false 로 끔), depth 기준은 THEME.depth.bg
  constructor(scene, o = {}) {
    this.scene = scene;
    this.zone = o.zone || 1;
    this.parts = [];
    bakeZone(scene, this.zone);
    const at = liveZones.indexOf(this.zone);
    if (at >= 0) liveZones.splice(at, 1);
    liveZones.push(this.zone);
    while (liveZones.length > 2) { const old = liveZones.shift(); this.pendingDrop = (this.pendingDrop || []).concat(old); }
    this.themeId = o.theme || appliedTheme();
    const z = THEME.zones[this.zone];
    const th = THEME.themes[this.themeId];
    let skyKey = `bg_sky_${this.zone}`;
    if (th && Array.isArray(th.sky)) {
      skyKey = `bg_sky_t_${this.themeId}_${this.zone}`;
      bake(scene, skyKey, 540, 960, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 960);
        g.addColorStop(0, th.sky[0]); g.addColorStop(0.26, th.sky[1]); g.addColorStop(0.4, th.sky[2]); g.addColorStop(0.62, z.ground[0]); g.addColorStop(1, z.ground[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, 540, 960);
      }, 1);
    }
    const D = THEME.depth;
    this.sky = scene.add.image(270, 480, skyKey).setDepth(D.bg);
    this.far = scene.add.image(270, BG_CROP.far.y + BG_CROP.far.h / 2, `bg_far_${this.zone}`).setDepth(D.bg + 1);
    this.clouds = [];
    for (const [x, y, w] of (o.clouds || [])) {
      const c = scene.add.image(x + w / 2, y + (w * 171) / 256 / 2, 'cloud').setDisplaySize(w, Math.round((w * 171) / 256)).setAlpha(0.92).setDepth(D.bg + 2);
      this.clouds.push(c);
      // 구름은 아주 느리게 오른쪽으로 흐른다 (cloudDrift 60000ms)
      scene.tweens.add({ targets: c, x: c.x + 40, duration: M.cloudDrift / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.mid = scene.add.image(270, BG_CROP.mid.y + BG_CROP.mid.h / 2, `bg_mid_${this.zone}`).setDepth(D.bg + 3);
    this.front = scene.add.image(270, BG_CROP.front.y + BG_CROP.front.h / 2, `bg_front_${this.zone}`).setDepth(D.mid + 1);
    this.mid.x = 270 - 6;
    this.front.x = 270 - 10;
    scene.tweens.add({ targets: this.mid, x: 270 + 6, duration: M.bgMid, yoyo: true, repeat: -1, ease: THEME.easing.bgMid });
    scene.tweens.add({ targets: this.front, x: 270 + 10, duration: M.bgFront, yoyo: true, repeat: -1, ease: THEME.easing.bgFront });
    this.parts.push(this.sky, this.far, this.mid, this.front, ...this.clouds);
    if (o.motes !== false) this.startMotes(z.mote);
    // 안 쓰는 챕터의 텍스처는 이 장면이 만들어진 뒤에 지운다 (이전 장면은 이미 닫혔다)
    if (this.pendingDrop) for (const old of this.pendingDrop) dropZone(scene, old);
    this.zoneMote = z.mote;
    this.depthMotes = D.mid + 2;
  }

  startMotes(mote) {
    const conf = emitterConfig(this.themeId, mote, limits());
    const keys = Array.isArray(conf.key) ? conf.key : [conf.key];
    const key = keys[Math.floor(Math.random() * keys.length)];
    const { yoyo, ...cfg } = conf.cfg;
    this.motes = this.scene.add.particles(0, 0, key, { ...cfg, alpha: cfg.alpha !== undefined ? cfg.alpha : 1 });
    this.motes.setDepth(THEME.depth.mid + 2);
    this.parts.push(this.motes);
  }

  // 테마를 바꿀 때: 입자를 교체하고 하늘을 400ms 크로스페이드한다 (F42)
  destroy() {
    for (const p of this.parts) { try { this.scene.tweens.killTweensOf(p); p.destroy(); } catch (e) { /* 이미 파괴됨 */ } }
    this.parts = [];
  }
}

export { dropZone };
