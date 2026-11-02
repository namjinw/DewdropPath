// 이슬 캐릭터 (R40, plan 3-8, theme.dew.rig): 얼굴 없는 몸통 이미지 2장 + 코드로 그린 얼굴 + 머리 장식.
// 구조: root(위치, 깡총 y) > facing(오른쪽 이동일 때만 scaleX -1) > bodyRig(몸 늘어남/찌그러짐/숨쉬기 scale, 항상 양수) > [body, faceRig, hat].
// 얼굴은 bodyRig 안에 있어 몸을 따라 움직이고, faceRig 가 scale 을 절반만 따라가게(dewFaceFollowRatio) 반대 scale 을 준다.
import { THEME } from '../theme.js';
import { CONFIG } from '../config.js';
import { ART_SCALE } from '../art.js';
import { SKIN_BY_ID } from '../catalog.js';

const D = THEME.dew;
const F = D.face;
const M = THEME.motionMs;
const E = THEME.easing;
const hex = (s) => parseInt(s.slice(1), 16);
const INK = hex(F.eyeColor);

const HAT_KEY = { skin_sprout_hat: 'skin_sprout_hat', skin_petal_ribbon: 'skin_petal_ribbon', skin_mushroom_cap: 'skin_mushroom_cap', skin_lily_umbrella: 'skin_lily_umbrella', skin_acorn_cap: 'skin_acorn_cap' };
const HAT_SWAY = { skin_sprout_hat: [4, 2400], skin_petal_ribbon: [8, 1800], skin_mushroom_cap: [3, 2600], skin_lily_umbrella: [5, 2200], skin_acorn_cap: [3, 2800] };

export class DewRig {
  // o: x, y(몸 기준점 = 이미지 아래 가운데에서 0.11 위), box(이미지 한 변), skin(스킨 id), depth, shadow(접지 그림자 여부)
  constructor(scene, o = {}) {
    this.scene = scene;
    this.box = o.box || D.imageBoxPx.play;
    this.unit = (this.box * D.bodyRatio) / 64; // 얼굴 1 단위 = 64px 몸 기준 1px
    this.root = scene.add.container(o.x || 0, o.y || 0);
    this.facing = scene.add.container(0, 0);
    this.bodyRig = scene.add.container(0, 0);
    this.faceRig = scene.add.container(0, (122 / 256 - 0.89) * this.box);
    this.face = scene.add.graphics();
    this.faceRig.add(this.face);
    this.body = scene.add.image(0, 0, 'dew_body').setOrigin(0.5, 0.89).setDisplaySize(this.box, this.box);
    this.hat = null;
    if (o.shadow !== false) {
      this.shadow = scene.add.image(0, -2, 'shadow_ellipse').setScale((this.box * 0.66) / (64 * ART_SCALE)).setAlpha(0.9);
      this.root.add(this.shadow);
    }
    this.bodyRig.add([this.body, this.faceRig]);
    this.facing.add(this.bodyRig);
    this.root.add(this.facing);
    if (o.depth !== undefined) this.root.setDepth(o.depth);
    this.dir = 'down';
    this.expr = 'idle';
    this.gaze = [0, 0];
    this.eyeScaleY = 1;
    this.sx = 1; this.sy = 1;
    this.walkGaze = false;
    this.bodyTween = null;
    this.breathTween = null;
    this.blinkTimer = null;
    this.skinId = 'skin_default';
    this.setSkin(o.skin || 'skin_default');
    this.drawFace();
    this.root.rig = this;
  }

  add(parent) { parent.add(this.root); return this; }
  setPosition(x, y) { this.root.setPosition(x, y); return this; }
  setDepth(d) { this.root.setDepth(d); return this; }
  setVisible(v) { this.root.setVisible(v); return this; }

  // ---- 스킨: 색 스킨은 @neutral 몸통 + MULTIPLY tint, 머리 장식은 몸 위쪽 앵커에 얹는다 ----
  setSkin(id, animate = false) {
    const sk = SKIN_BY_ID[id] || SKIN_BY_ID.skin_default;
    this.skinId = sk.id;
    if (this.rainbow) { this.rainbow.remove(); this.rainbow = null; }
    if (this.hat) { this.hat.destroy(); this.hat = null; }
    if (this.hatTween) { this.hatTween.remove(); this.hatTween = null; }
    const colorSkin = sk.kind === 'color';
    this.neutral = colorSkin;
    this.applyBodyTexture();
    const tint = THEME.tint.skins[sk.id];
    if (colorSkin && sk.id !== 'skin_rainbow') {
      const to = hex(tint);
      if (animate) {
        const from = this.body.tintTopLeft || 0xffffff;
        const c0 = Phaser.Display.Color.IntegerToColor(from); const c1 = Phaser.Display.Color.IntegerToColor(to);
        const proxy = { v: 0 };
        this.scene.tweens.add({ targets: proxy, v: 1, duration: M.skinApply, ease: E.skinApply, onUpdate: () => { const c = Phaser.Display.Color.Interpolate.ColorWithColor(c0, c1, 1, proxy.v); this.body.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b)); } });
      } else this.body.setTint(to);
    } else if (sk.id === 'skin_rainbow') {
      const proxy = { t: 0 };
      this.rainbow = this.scene.tweens.add({ targets: proxy, t: 1, duration: 6000, repeat: -1, ease: 'Linear', onUpdate: () => { const c = Phaser.Display.Color.HSVToRGB(proxy.t, 0.32, 1); this.body.setTint(c.color); } });
    } else this.body.clearTint();
    if (sk.kind === 'hat' && HAT_KEY[sk.id]) {
      const a = D.hatAnchor;
      const hw = a.w * this.box;
      this.hat = this.scene.add.image(0, (-0.89 + (a.y)) * this.box + hw / 2, HAT_KEY[sk.id]).setDisplaySize(hw, hw).setAngle(a.rotationDeg);
      this.bodyRig.add(this.hat);
      const [deg, ms] = HAT_SWAY[sk.id];
      this.hatBase = a.rotationDeg;
      this.hatTween = this.scene.tweens.add({ targets: this.hat, angle: { from: a.rotationDeg - deg, to: a.rotationDeg + deg }, duration: ms / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }
  applyBodyTexture() {
    const left = this.dir === 'left' || this.dir === 'right';
    const base = left ? 'dew_body_left' : 'dew_body';
    const key = this.neutral && this.scene.textures.exists(`${base}@neutral`) ? `${base}@neutral` : base;
    if (this.scene.textures.exists(key)) this.body.setTexture(key);
    this.body.setDisplaySize(this.box, this.box);
  }

  // ---- 방향: 슬라이드 시작 프레임에 즉시 교체(크로스페이드 없음). 위 = 정면 몸통 + 얼굴 숨김(뒷모습) ----
  setDir(dir) {
    if (dir === this.dir) return this;
    this.dir = dir;
    this.facing.scaleX = dir === 'right' ? -1 : 1;
    this.applyBodyTexture();
    this.drawFace();
    return this;
  }

  // ---- 표정 (3-8 상태표) ----
  setExpr(name, gaze) {
    this.expr = name;
    if (gaze) this.gaze = gaze;
    this.drawFace();
    return this;
  }
  setGaze(dx, dy) { this.gaze = [dx, dy]; this.drawFace(); return this; }

  drawFace() {
    // 같은 상태면 Graphics 를 지우고 다시 그리지 않는다 (한 이동 안에서 setDir/setGaze/setExpr 가 여러 번 불러도 한 번만 그린다)
    const key = `${this.dir}|${this.expr}|${this.gaze[0]},${this.gaze[1]}|${this.eyeScaleY}`;
    if (key === this.faceKey) return;
    this.faceKey = key;
    const g = this.face;
    g.clear();
    if (this.dir === 'up') return;
    const u = this.unit;
    const side = this.dir === 'left' || this.dir === 'right';
    const mode = this.expr;
    const eg = side ? F.side.eyeGap : F.eyeGap;
    const sh = (side ? F.side.shift : 0) + this.gaze[0];
    const gy = this.gaze[1];
    const ex = [sh - eg / 2, sh + eg / 2];
    const erx = side ? F.side.eyeRx : F.eyeRx;
    const ery = (mode === 'worry' ? 5 : F.eyeRy) * this.eyeScaleY;
    // 앵커 (32, 44.6) 가 원점
    const P = (x, y) => [x * u, y * u];
    const line = (pts, w, col = INK) => { g.lineStyle(w * u, col, 1); g.beginPath(); pts.forEach(([x, y], i) => { const [px, py] = P(x, y); if (i) g.lineTo(px, py); else g.moveTo(px, py); }); g.strokePath(); };
    const quad = (x0, y0, cx, cy, x1, y1, n = 8) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n; const a = (1 - t) * (1 - t); const b = 2 * (1 - t) * t; const c = t * t; out.push([a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1]); } return out; };
    // 눈
    if (mode === 'hop' || mode === 'clear') ex.forEach((x) => line(quad(x - 3.5, 1.5 + gy, x, -3.5 + gy, x + 3.5, 1.5 + gy), 2.2));
    else if (mode === 'closed') ex.forEach((x) => line([[x - 3.5, gy], [x + 3.5, gy]], 2.2));
    else {
      ex.forEach((x) => {
        g.fillStyle(INK, 1); const [px, py] = P(x, gy); g.fillEllipse(px, py, erx * 2 * u, ery * 2 * u);
        g.fillStyle(0xffffff, 1); const [hx, hy] = P(x + F.highlight.dx, gy + F.highlight.dy); g.fillCircle(hx, hy, F.highlight.r * u);
      });
    }
    // 눈썹 (걱정)
    if (mode === 'worry') ex.forEach((x, i) => line([[x - 4, -9 + gy + (i ? -1.5 : 1.5)], [x + 4, -9 + gy + (i ? 1.5 : -1.5)]], F.brow.width));
    // 볼
    const ca = mode === 'smile' || mode === 'clear' ? F.cheek.alphaSmile : F.cheek.alpha;
    const cheekXs = side ? [ex[0] - 5] : [ex[0] - F.cheek.dx, ex[1] + F.cheek.dx];
    g.fillStyle(hex(F.cheek.color), ca);
    cheekXs.forEach((x) => { const [px, py] = P(x, F.cheek.dy + gy); g.fillEllipse(px, py, F.cheek.rx * 2 * u, F.cheek.ry * 2 * u); });
    // 입
    const mx = sh + (side ? F.side.mouthShift : 0) - this.gaze[0] * 0.3 - (side ? 0 : 0);
    const my = F.mouth.dy + gy;
    const mw = side ? F.side.mouthHalfWidth : 4;
    if (mode === 'idle' || mode === 'hop') line(quad(mx - mw, my, mx, my + 3, mx + mw, my), 2);
    else if (mode === 'smile') line(quad(mx - 5, my, mx, my + 5, mx + 5, my), 2);
    else if (mode === 'slide') { g.fillStyle(INK, 1); const [px, py] = P(mx, my + 1); g.fillCircle(px, py, F.mouth.oRadius * u); }
    else if (mode === 'worry') line([[mx - 4, my + 1], [mx - 3, my - 0.5], [mx - 2, my + 1], [mx - 1, my - 0.5], [mx, my + 1], [mx + 1, my - 0.5], [mx + 2, my + 1], [mx + 3, my - 0.5], [mx + 4, my + 1]], 2);
    else if (mode === 'closed') line(quad(mx - 3, my, mx, my + 2, mx + 3, my), 2);
    else if (mode === 'clear') {
      g.fillStyle(INK, 1); g.beginPath();
      const half = 5;
      for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; const [px, py] = P(mx - Math.cos(a) * half, my - 0.5 + Math.sin(a) * half); if (i) g.lineTo(px, py); else g.moveTo(px, py); }
      g.closePath(); g.fillPath();
      g.fillStyle(0xff8fa6, 1); const [tx, ty] = P(mx, my + 2.6); g.fillEllipse(tx, ty, 5 * u, 2.4 * u);
    }
  }

  // ---- 몸 scale: 얼굴이 몸을 반만 따라가도록 faceRig 에 반대 scale 을 준다 ----
  setBodyScale(sx, sy) {
    this.sx = sx; this.sy = sy;
    this.bodyRig.setScale(sx, sy);
    const r = CONFIG.dewFaceFollowRatio;
    this.faceRig.setScale((1 + (sx - 1) * r) / sx, (1 + (sy - 1) * r) / sy);
  }
  // 몸 scale 트윈 하나만 돌린다. 끝나면 done 호출. rest 면 숨쉬기를 다시 시작한다
  scaleTo(sx, sy, ms, ease, done) {
    this.stopBreath();
    if (this.bodyTween) this.bodyTween.remove();
    const p = { x: this.sx, y: this.sy };
    this.bodyTween = this.scene.tweens.add({
      targets: p, x: sx, y: sy, duration: Math.max(1, ms), ease,
      onUpdate: () => this.setBodyScale(p.x, p.y),
      onComplete: () => { this.bodyTween = null; this.setBodyScale(sx, sy); if (done) done(); }
    });
    return this;
  }
  // 슬라이드 시작: 진행 방향 1.18배, 수직 0.88배 (60ms)
  stretch(horizontal) {
    const L = CONFIG.dewSlideStretchRatio; const S = CONFIG.dewSlideSquashRatio;
    return this.scaleTo(horizontal ? L : S, horizontal ? S : L, M.dewStretch, E.dewStretch);
  }
  // 멈춤: 진행 방향 0.88, 수직 1.12 로 120ms 찌그러진 뒤 1.0 으로 100ms Back
  stopSquash(horizontal, done) {
    const a = 0.88; const b = 1.12;
    return this.scaleTo(horizontal ? a : b, horizontal ? b : a, M.dewStopSquash, E.dewStopSquash, () => this.scaleTo(1, 1, M.dewStopRecover, E.dewStopRecover, () => { this.startBreath(); if (done) done(); }));
  }
  // 개화: 1.06배 pop 150ms
  pop() { return this.scaleTo(1.06, 1.06, M.dewBloomPop / 2, E.dewBloomPop, () => this.scaleTo(1, 1, M.dewBloomPop / 2, E.dewBloomPop, () => this.startBreath())); }
  // 방향 교체 눌림 .94 -> 1.0 (80ms)
  turnPress() { return this.scaleTo(0.94, 0.94, M.dewTurn / 2, E.dewTurn, () => this.scaleTo(1, 1, M.dewTurn / 2, E.dewTurn)); }
  // 대기 숨쉬기 1.0 <-> 1.04 (800ms 씩)
  startBreath() {
    if (this.breathTween || this.bodyTween || this.destroyed) return this;
    const p = { v: 1 };
    this.setBodyScale(1, 1);
    this.breathTween = this.scene.tweens.add({ targets: p, v: CONFIG.dewBreathScaleRatio, duration: M.dewBreath, yoyo: true, repeat: -1, ease: E.dewBreath, onUpdate: () => this.setBodyScale(p.v, p.v) });
    return this;
  }
  stopBreath() { if (this.breathTween) { this.breathTween.remove(); this.breathTween = null; } return this; }

  // ---- 눈 깜빡임: 2.5~5 초 무작위 간격 ----
  startBlink() {
    const next = () => {
      this.blinkTimer = this.scene.time.delayedCall(Phaser.Math.Between(CONFIG.dewBlinkMinMs, CONFIG.dewBlinkMaxMs), () => {
        if (this.destroyed) return;
        if (this.expr === 'idle' || this.expr === 'smile') {
          const p = { k: 1 };
          this.scene.tweens.add({ targets: p, k: 0.1, duration: CONFIG.dewBlinkMs / 2, yoyo: true, ease: E.dewBlink, onUpdate: () => { this.eyeScaleY = p.k; this.drawFace(); }, onComplete: () => { this.eyeScaleY = 1; this.drawFace(); } });
        }
        next();
      });
    };
    if (!this.blinkTimer) next();
    return this;
  }

  // ---- 위치 효과 (facing 컨테이너로 떨림, root 로 깡총) ----
  shake(px = 6, ms = M.dewBlocked) {
    this.scene.tweens.killTweensOf(this.facing);
    this.facing.x = 0;
    const sgn = this.facing.scaleX;
    this.scene.tweens.add({ targets: this.facing, x: { from: -px * sgn, to: px * sgn }, duration: ms / 8, yoyo: true, repeat: 3, ease: E.dewBlocked, onComplete: () => { this.facing.x = 0; } });
    return this;
  }
  // 깡총: root 의 y 를 height 만큼 올렸다 내린다. 착지에 스쿼시. n 번 반복
  hop(height, ms, n = 1, done) {
    const y0 = this.root.y;
    this.hopping = true;
    this.scene.tweens.add({
      targets: this.root, y: y0 - height, duration: ms / 2, yoyo: true, repeat: n - 1, ease: E.dewClearHop,
      onComplete: () => { this.root.y = y0; this.hopping = false; if (done) done(); }
    });
    return this;
  }

  destroy() {
    this.destroyed = true;
    this.stopBreath();
    if (this.bodyTween) this.bodyTween.remove();
    if (this.blinkTimer) this.blinkTimer.remove();
    if (this.rainbow) this.rainbow.remove();
    if (this.hatTween) this.hatTween.remove();
    this.scene.tweens.killTweensOf(this.facing);
    this.root.destroy();
  }
}
