// 판(S3)의 그림과 움직임 (plan 3-1 연출, 3-12-1 요소별 이미지·움직임, F1~F13, F27~F32, F45).
// 판정은 puzzle.js 가 먼저 계산하고, 이 모듈은 결과(events)를 따라 같은 시각에 출발하는 연출을 재생한다 (R26).
import { THEME } from '../theme.js';
import { CONFIG } from '../config.js';
import { K, COLS } from '../puzzle.js';
import { sfx } from '../audio.js';
import { limits } from '../perf.js';
import { hex, DEPTH, glowSprite } from '../ui/kit.js';
import { ART_SCALE, bake, roundRect } from '../art.js';

const G = THEME.board;
const OB = G.objects;
const M = THEME.motionMs;
const E = THEME.easing;
const CS = G.grid.cellPx;
const DIRS = ['up', 'right', 'down', 'left'];
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const ARROW_ANGLE = { 0: -90, 1: 0, 2: 90, 3: 180 };
const ACORN_SPIN_DEG = 120; // 칸당 회전 (3-12-1 도토리)
const dewDy = () => 0.89 * THEME.dew.imageBoxPx.play - 6 - CS / 2; // 칸 중심에서 이슬 기준점(몸 아래)까지

// 시간에 맞춘 연출 재생기: 트랙(위치 보간)과 큐(특정 시각 호출)를 한 카운터로 돌린다
class Timeline {
  constructor(scene) { this.scene = scene; this.tracks = []; this.cues = []; this.dur = 0; }
  track(t) { this.tracks.push({ done: false, ...t }); this.dur = Math.max(this.dur, t.t1); return this; }
  cue(t, fn) { this.cues.push({ t, fn, fired: false }); this.dur = Math.max(this.dur, t); return this; }
  run(onDone) {
    this.cues.sort((a, b) => a.t - b.t);
    const step = (now) => {
      for (const tr of this.tracks) {
        if (tr.done || now < tr.t0) continue;
        const k = tr.t1 > tr.t0 ? Math.min(1, (now - tr.t0) / (tr.t1 - tr.t0)) : 1;
        const e = tr.ease ? tr.ease(k) : k;
        const x = tr.x0 + (tr.x1 - tr.x0) * e;
        const y = tr.y0 + (tr.y1 - tr.y0) * e - (tr.arc ? Math.sin(k * Math.PI) * tr.arc : 0);
        tr.target.setPosition(x, y);
        if (tr.rot) tr.target.angle = tr.rot * k;
        if (k >= 1) tr.done = true;
      }
      for (const c of this.cues) if (!c.fired && now >= c.t) { c.fired = true; try { c.fn(); } catch (err) { console.error(err); } }
    };
    if (this.dur <= 0) { step(0); if (onDone) onDone(); return; }
    this.counter = this.scene.tweens.addCounter({ from: 0, to: this.dur, duration: this.dur, ease: 'Linear', onUpdate: (tw) => step(tw.getValue()), onComplete: () => { step(this.dur + 1); if (onDone) onDone(); } });
  }
  stop() { if (this.counter) this.counter.remove(); }
}

export class Board {
  // o: zone(챕터 1~5), depth, tint(MULTIPLY 칸 색조, 테마 적용 시 theme.grassTint)
  constructor(scene, level, state, o = {}) {
    this.scene = scene;
    this.level = level;
    this.zone = o.zone || 1;
    this.base = DEPTH.objects;
    this.tweens = [];
    this.drawFrame();
    this.drawGrass(o.tint);
    this.buildObjects(state);
    this.makeEmitters();
    this.snap(state);
  }

  // ---- 좌표 ----
  left(cell) { return G.grid.x + (cell % COLS) * CS; }
  top(cell) { return G.grid.y + Math.floor(cell / COLS) * CS; }
  center(cell) { return { x: this.left(cell) + CS / 2, y: this.top(cell) + CS / 2 }; }
  anchor(cell) { const c = this.center(cell); return { x: c.x, y: c.y + dewDy() }; }
  cellAt(x, y) {
    const c = Math.floor((x - G.grid.x) / CS);
    const r = Math.floor((y - G.grid.y) / CS);
    return c < 0 || c >= 6 || r < 0 || r >= 6 ? -1 : r * COLS + c;
  }

  // ---- 판 프레임 (S3 board frame: 챕터 그라데이션, 5px 테두리, 안쪽 하이라이트) ----
  // 매 프레임 다시 그리지 않도록 한 번 구워 이미지 한 장으로 쓴다 (겹친 큰 둥근 사각형 5겹이 소프트웨어 렌더에서 가장 큰 비용이었다)
  drawFrame() {
    const z = THEME.zones[this.zone];
    const f = G.frame;
    const key = `board_frame_${this.zone}`;
    const extra = 18;
    bake(this.scene, key, f.w, f.h + extra, (ctx) => {
      const rr = (x, y, w, h, r) => roundRect(ctx, x, y, w, h, r);
      ctx.fillStyle = 'rgba(43,74,59,0.1)'; rr(4, extra, f.w - 8, f.h, f.radius); ctx.fill();
      ctx.fillStyle = 'rgba(43,74,59,0.18)'; rr(0, 10, f.w, f.h, f.radius); ctx.fill();
      ctx.fillStyle = z.boardEdge; rr(0, 0, f.w, f.h, f.radius); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(f.edgePx, f.edgePx, f.w - f.edgePx * 2, f.h - f.edgePx * 2, f.radius - f.edgePx); ctx.fill();
      const gr = ctx.createLinearGradient(0, f.edgePx + 4, 0, f.h - f.edgePx);
      gr.addColorStop(0, z.board[0]); gr.addColorStop(1, z.board[1]);
      ctx.fillStyle = gr; rr(f.edgePx, f.edgePx + 4, f.w - f.edgePx * 2, f.h - f.edgePx * 2 - 4, f.radius - f.edgePx); ctx.fill();
    });
    this.frame = this.scene.add.image(f.x, f.y, key).setOrigin(0, 0).setScale(1 / ART_SCALE).setDepth(DEPTH.mid);
  }

  drawGrass(tint) {
    const z = THEME.zones[this.zone];
    const col = hex(tint || z.grassTint);
    this.grass = [];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const im = this.scene.add.image(G.grid.x + c * CS + CS / 2, G.grid.y + r * CS + CS / 2, (r + c) % 2 ? 'grass_b@pastel' : 'grass_a@pastel').setDisplaySize(CS, CS).setDepth(DEPTH.mid + 1);
        im.setTint(col);
        this.grass.push(im);
      }
    }
    const g = this.scene.add.graphics().setDepth(DEPTH.mid + 2);
    g.lineStyle(1, 0x2B4A3B, 0.07);
    for (let i = 0; i <= 6; i++) {
      g.lineBetween(G.grid.x + i * CS, G.grid.y, G.grid.x + i * CS, G.grid.y + 6 * CS);
      g.lineBetween(G.grid.x, G.grid.y + i * CS, G.grid.x + 6 * CS, G.grid.y + i * CS);
    }
    this.lines = g;
  }

  // ---- 이미지 한 장: spec [w,h,dx,dy] 은 칸 왼쪽 위 기준 ----
  put(key, cell, spec, o = {}) {
    const [w, h, dx, dy] = spec;
    const im = this.scene.add.image(this.left(cell) + dx + w / 2, this.top(cell) + dy + h / 2, key).setDisplaySize(w, h);
    im.setDepth(o.depth !== undefined ? o.depth : this.base + Math.floor(cell / COLS) * 0.1);
    im.cell = cell;
    return im;
  }
  shadow(cell, w = 54) {
    return this.scene.add.image(this.center(cell).x, this.top(cell) + 72, 'shadow_ellipse').setScale(w / (64 * ART_SCALE)).setAlpha(0.8).setDepth(DEPTH.mid + 3);
  }
  yoyo(target, props, ms, ease = 'Sine.easeInOut', delay = 0) {
    const tw = this.scene.tweens.add({ targets: target, ...props, duration: ms, yoyo: true, repeat: -1, ease, delay });
    this.tweens.push(tw);
    return tw;
  }

  buildObjects(state) {
    const lv = this.level;
    const sc = this.scene;
    this.rocks = []; this.trees = []; this.dirts = []; this.buds = []; this.ices = []; this.petals = []; this.leaves = []; this.mush = [];
    this.pots = []; this.acorns = []; this.frogs = []; this.puddleRings = [];
    for (let cell = 0; cell < 36; cell++) {
      const k = lv.kind[cell];
      if (k === K.ROCK) { this.shadow(cell); this.rocks.push(this.put('rock', cell, OB.rock)); }
      else if (k === K.TREE) {
        this.shadow(cell, 60);
        const im = this.put('tree', cell, OB.tree).setOrigin(0.5, 1);
        im.y = this.top(cell) + OB.tree[3] + OB.tree[1];
        this.yoyo(im, { angle: { from: -1.5, to: 1.5 } }, 1600, 'Sine.easeInOut', (cell * 217) % 1200);
        this.trees.push(im);
      } else if (k === K.DIRT) {
        this.shadow(cell);
        const im = this.put('dirt', cell, OB.dirt);
        im.idx = lv.dirtAt[cell];
        this.dirts[im.idx] = im;
      } else if (k === K.ICE) {
        const im = this.put('ice', cell, OB.ice, { depth: DEPTH.mid + 4 });
        im.idx = lv.iceAt[cell];
        this.ices[im.idx] = im;
        const ring = sc.add.circle(this.center(cell).x, this.center(cell).y + 4, 28).setStrokeStyle(2, 0xFFFFFF, 0.9).setFillStyle().setDepth(DEPTH.mid + 5).setVisible(false);
        this.puddleRings[im.idx] = ring;
        this.yoyo(ring, { scale: { from: 0.6, to: 1.0 }, alpha: { from: 0.5, to: 0 } }, M.puddleRipple / 2, E.puddleRipple);
      } else if (k === K.PETAL) {
        const im = this.put('petal_portal', cell, OB.petal, { depth: DEPTH.mid + 4 });
        const pair = lv.pairAt[cell];
        if (pair === 1) im.setTint(hex(THEME.tint.petalB));
        sc.tweens.add({ targets: im, angle: 360, duration: M.petalSpin, repeat: -1, ease: 'Linear' });
        this.petals.push(im);
      } else if (k === K.ARROW) {
        const im = this.put('arrow_leaf', cell, OB.arrowLeaf, { depth: DEPTH.mid + 4 }).setAngle(ARROW_ANGLE[lv.arrowDir[cell]]);
        im.baseAngle = im.angle;
        this.yoyo(im, { angle: { from: im.angle - 3, to: im.angle + 3 } }, 1200, 'Sine.easeInOut', (cell * 131) % 900);
        this.leaves[cell] = im;
      } else if (k === K.MUSH) {
        this.shadow(cell);
        const im = this.put('mushroom', cell, OB.mushroom).setOrigin(0.5, 1);
        im.y = this.top(cell) + OB.mushroom[3] + OB.mushroom[1];
        im.bs = im.scaleY;
        this.yoyo(im, { scaleY: { from: im.scaleY, to: im.scaleY * 1.04 } }, 1100, 'Sine.easeInOut', (cell * 97) % 700);
        this.mush[cell] = im;
      }
    }
    lv.buds.forEach((cell, i) => {
      this.shadow(cell, 40);
      const im = this.put('flower_0_bud', cell, OB.flowerBud);
      im.y = this.top(cell) + 38;
      im.stage = 0; im.bud = i;
      this.buds[i] = im;
    });
    lv.pots.forEach((cell, i) => this.pots[i] = this.makeMovable('pot', cell, OB.pot));
    lv.acorns.forEach((cell, i) => this.acorns[i] = this.makeMovable('acorn', cell, OB.acorn));
    lv.frogs.forEach((f, i) => {
      const c = this.makeMovable('frog', f.path[0], OB.frog);
      c.img.setOrigin(0.5, 1); c.img.y = OB.frog[3] + OB.frog[1] - CS / 2;
      c.bs = c.img.scaleY;
      this.yoyo(c.img, { scaleY: { from: c.bs, to: c.bs * 1.05 } }, 800, 'Sine.easeInOut', i * 250);
      this.frogs[i] = c;
    });
  }

  makeMovable(key, cell, spec) {
    const c = this.center(cell);
    const [w, h, dx, dy] = spec;
    const cont = this.scene.add.container(c.x, c.y);
    const sh = this.scene.add.image(0, 32, 'shadow_ellipse').setScale(54 / (64 * ART_SCALE)).setAlpha(0.8);
    const img = this.scene.add.image(dx + w / 2 - CS / 2, dy + h / 2 - CS / 2, key).setDisplaySize(w, h);
    cont.add([sh, img]);
    cont.img = img; cont.shadowImg = sh; cont.cell = cell; cont.key = key;
    cont.setDepth(this.base + Math.floor(cell / COLS) * 0.1);
    return cont;
  }

  makeEmitters() {
    const sc = this.scene;
    const cap = limits().boardParticles;
    const mk = (key, cfg) => sc.add.particles(0, 0, key, { emitting: false, maxAliveParticles: Math.round(cap / 4), ...cfg }).setDepth(DEPTH.mid + 14);
    this.fx = {
      petal: mk('p_petal', { lifespan: 700, speed: { min: 40, max: 110 }, gravityY: 120, scale: { start: 1, end: 0.6 }, alpha: { start: 1, end: 0 }, rotate: { start: 0, end: 220 } }),
      dust: mk('p_dust', { lifespan: 450, speed: { min: 15, max: 45 }, scale: { start: 0.5, end: 1.1 }, alpha: { start: 0.7, end: 0 } }),
      shard: mk('p_shard', { lifespan: 500, speed: { min: 60, max: 150 }, gravityY: 260, scale: { start: 1, end: 0.4 }, alpha: { start: 1, end: 0 }, rotate: { start: 0, end: 300 } }),
      crumb: mk('p_crumb', { lifespan: 500, speed: { min: 40, max: 110 }, gravityY: 240, scale: { start: 1, end: 0.3 }, alpha: { start: 1, end: 0 } }),
      leaf: mk('p_leaf', { lifespan: 600, speed: { min: 25, max: 70 }, gravityY: 130, scale: { start: 1, end: 0.5 }, alpha: { start: 1, end: 0 }, rotate: { start: 0, end: 180 } }),
      spark: mk('p_spark', { lifespan: 520, speed: { min: 30, max: 120 }, scale: { start: 0.9, end: 0 }, alpha: { start: 1, end: 0 }, blendMode: 'ADD' }),
      tail: mk('p_tail', { lifespan: 420, speed: { min: 5, max: 20 }, scale: { start: 1, end: 0.2 }, alpha: { start: 0.9, end: 0 } }),
      // 클리어 꽃잎 (F6): 클리어마다 새로 만들지 않고 한 번 만들어 explode 만 한다
      clear: mk('p_petal', { emitting: false, maxAliveParticles: Math.min(30, Math.round(cap / 2)), lifespan: 1400, speed: { min: 60, max: 220 }, angle: { min: 200, max: 340 }, gravityY: 160, scale: { start: 1.2, end: 0.6 }, alpha: { start: 1, end: 0 }, rotate: { start: 0, end: 360 } })
    };
  }
  burst(kind, n, x, y) { try { this.fx[kind].explode(n, x, y); } catch (e) { /* 입자 실패는 무시 */ } }

  // ---- 상태를 한 번에 맞춘다 (시작, 다시 시작) ----
  snap(state) {
    const lv = this.level;
    this.state = state;
    for (const b of this.buds) this.setBloomStage(b, (state.bloom >> b.bud) & 1 ? 3 : 0, true);
    this.ices.forEach((im, i) => {
      const broken = (state.broken >> i) & 1;
      im.setTexture(broken ? 'puddle' : 'ice').setScale(im.scaleX).setDisplaySize(80, 80).setAlpha(1);
      this.puddleRings[i].setVisible(!!broken);
    });
    this.dirts.forEach((im, i) => { const gone = (state.collapsed >> i) & 1; im.setTexture('dirt').setDisplaySize(80, 80).setVisible(!gone).setAlpha(1).setScale(im.scaleX); });
    this.pots.forEach((c, i) => this.placeMovable(c, state.pot[i]));
    this.acorns.forEach((c, i) => { this.placeMovable(c, state.acorn[i]); c.img.angle = 0; });
    this.frogs.forEach((c, i) => {
      const f = lv.frogs[i];
      const cell = f.path[state.frog[i * 2]];
      this.placeMovable(c, cell);
      const dir = state.frog[i * 2 + 1];
      c.img.scaleX = Math.abs(c.img.scaleX) * (dir < 0 ? -1 : 1);
    });
  }
  placeMovable(c, cell) { const p = this.center(cell); c.setPosition(p.x, p.y); c.cell = cell; c.setDepth(this.base + Math.floor(cell / COLS) * 0.1); }

  setBloomStage(b, stage, instant) {
    b.stage = stage;
    const keys = ['flower_0_bud', 'flower_1_wake', 'flower_2_half', 'flower_3_bloom'];
    b.setTexture(keys[stage]);
    const spec = stage === 3 ? OB.flowerBloom : OB.flowerBud;
    b.setDisplaySize(spec[0], spec[1]);
    b.bs = b.scaleX;
    if (b.idle) { b.idle.remove(); b.idle = null; }
    b.angle = 0;
    if (instant) {
      if (stage === 0) b.idle = this.scene.tweens.add({ targets: b, scale: { from: b.bs, to: b.bs * 1.03 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: (b.bud * 311) % 1000 });
      else b.idle = this.scene.tweens.add({ targets: b, angle: { from: -2, to: 2 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: (b.bud * 211) % 800 });
    }
  }

  // 개화 4단계 키프레임 (F2, R47): 0 -> 100 -> 200ms 에 이미지를 차례로 바꾼다. 단계마다 scale 1.1 -> 1.0, 마지막 pop 1.0 -> 1.2 -> 1.0
  bloom(i, order, withSound = true) {
    const b = this.buds[i];
    if (!b || b.stage === 3) return;
    const sc = this.scene;
    if (b.idle) { b.idle.remove(); b.idle = null; }
    const stageTo = (st, pop) => {
      this.setBloomStage(b, st, false);
      b.setScale(b.bs * 1.1);
      sc.tweens.add({ targets: b, scale: b.bs, duration: M.bloomStep, ease: E.bloomStep });
      if (pop) {
        sc.tweens.add({ targets: b, scale: b.bs * CONFIG.flowerBloomPopRatio, duration: M.bloomPop / 2, yoyo: true, ease: E.bloomPop, onComplete: () => this.setBloomStage(b, 3, true) });
        const c = this.center(b.cell);
        this.burst('petal', 6, c.x, c.y - 6);
      }
    };
    stageTo(1, false);
    sc.time.delayedCall(M.bloomStep, () => stageTo(2, false));
    sc.time.delayedCall(M.bloomStep * 2, () => stageTo(3, true));
    if (withSound) sfx.bloom(order);
  }
  // 되돌리기: 150ms 안에 3 -> 0 으로 되돌린다 (F13)
  unbloom(i, ms = M.undo) {
    const b = this.buds[i];
    if (!b || b.stage === 0) return;
    const sc = this.scene;
    sc.tweens.killTweensOf(b);
    this.setBloomStage(b, 2, false);
    sc.time.delayedCall(ms / 3, () => { this.setBloomStage(b, 1, false); });
    sc.time.delayedCall((ms * 2) / 3, () => { this.setBloomStage(b, 0, true); b.setScale(b.bs); });
  }

  // ---- 칸 반응 ----
  leafShake(cell) { const im = this.leaves[cell]; if (!im) return; this.scene.tweens.add({ targets: im, angle: { from: im.baseAngle - 12, to: im.baseAngle + 12 }, duration: M.leafTurn / 4, yoyo: true, repeat: 1, ease: E.leafTurn, onComplete: () => { im.angle = im.baseAngle; } }); const c = this.center(cell); this.burst('leaf', 2, c.x, c.y); }
  petalPulse(cell) { const p = this.petals.find((im) => im.cell === cell); if (!p) return; this.scene.tweens.add({ targets: p, scale: { from: p.scaleX, to: p.scaleX * 1.25 }, duration: M.petalPortal / 2, yoyo: true, ease: E.petalPortal }); const c = this.center(cell); this.burst('petal', 4, c.x, c.y); }
  mushBounce(cell) { const im = this.mush[cell]; if (!im) return; this.scene.tweens.add({ targets: im, scaleY: { from: im.bs * 0.8, to: im.bs * 1.15 }, duration: M.mushroomBounce * 0.45, yoyo: true, ease: E.mushroomBounce, onComplete: () => { im.scaleY = im.bs; } }); }
  iceCrack(cell) { const im = this.ices.find((x) => x && x.cell === cell); if (!im) return; this.scene.time.delayedCall(M.iceCrack, () => { if (!this.ices[im.idx].broken) im.setTexture('ice_crack').setDisplaySize(80, 80); }); }
  bump(kind, targetCell, dir) {
    const sc = this.scene;
    const c = targetCell >= 0 ? this.center(targetCell) : null;
    if (kind === 'rock') { const im = this.rocks.find((r) => r.cell === targetCell); if (im) sc.tweens.add({ targets: im, scale: im.scaleX * 0.97, duration: M.rockBump / 2, yoyo: true, ease: E.rockBump }); if (c) this.burst('dust', 2, c.x - DX[dir] * 30, c.y - DY[dir] * 30); }
    else if (kind === 'tree') { const im = this.trees.find((r) => r.cell === targetCell); if (im) sc.tweens.add({ targets: im, angle: { from: -4, to: 4 }, duration: M.treeBump / 4, yoyo: true, repeat: 1, ease: E.treeBump, onComplete: () => { im.angle = 0; } }); if (c) this.burst('leaf', 2, c.x, c.y - 20); }
    else if (kind === 'dirt') { const im = this.dirts.find((r) => r && r.cell === targetCell); if (im) { im.setTexture('dirt_wet').setDisplaySize(80, 80); sc.tweens.add({ targets: im, scale: im.scaleX * 0.96, duration: M.dirtWet / 2, yoyo: true }); } }
    else if (kind === 'frog') { const fi = this.frogs.find((f) => f.cell === targetCell); if (fi) sc.tweens.add({ targets: fi.img, x: fi.img.x + 2, duration: 30, yoyo: true, repeat: 1 }); }
    else if (kind === 'acorn') { const a = this.acorns.find((f) => f.cell === targetCell); if (a) sc.tweens.add({ targets: a.img, scale: a.img.scaleX * 0.9, duration: M.acornSquash / 2, yoyo: true, ease: E.acornSquash }); }
    else if (kind === 'potStuck') { const p = this.pots.find((f) => f.cell === targetCell); if (p) sc.tweens.add({ targets: p.img, x: p.img.x + 3, duration: 30, yoyo: true, repeat: 1 }); }
    else if (kind === 'puddle') { const i = this.ices.findIndex((im) => im && im.cell === targetCell); if (i >= 0 && this.puddleRings[i]) { const r = this.puddleRings[i]; sc.tweens.add({ targets: r, scale: { from: 0.6, to: 1.1 }, alpha: { from: 0.8, to: 0 }, duration: 300 }); } }
  }

  // ---- 한 번의 이동 연출. prevState -> res.state. dew: DewRig. cb: { onCleared } ----
  play(res, prev, dew, done) {
    const sc = this.scene;
    const ev = res.events;
    const tl = new Timeline(sc);
    const speed = 1000 / CONFIG.slideSpeedCellsPerS;
    const dewCells = ev.filter((e) => e.e === 'step' && !e.landing).length;
    const ms = dewCells > 0 && dewCells * speed < CONFIG.slideMinDurationMs ? CONFIG.slideMinDurationMs / dewCells : speed;
    const start = ev.find((e) => e.e === 'start');
    const d0 = start.dir;
    let t = 0;
    let pos = this.anchor(start.cell);
    let curDir = d0;
    const horiz = (d) => d === 1 || d === 3;
    // 시작 프레임: 몸통/얼굴 교체와 늘어남
    const rig = dew;
    rig.root.setPosition(pos.x, pos.y);
    rig.root.setDepth(this.base + 8);
    const slideDir = (d) => { rig.setDir(DIRS[d]); rig.setGaze(0, d === 0 ? -3 : d === 2 ? 3 : 0); };
    const movedDew = res.dewMoved;
    if (movedDew) {
      slideDir(d0);
      rig.setExpr('slide');
      rig.turnPress();
      sc.time.delayedCall(M.dewTurn, () => rig.stretch(horiz(curDir)));
      sfx.slide(this.zone);
      // 물방울 꼬리 3개
      tl.cue(0, () => this.burst('tail', 3, rig.root.x - DX[curDir] * 20, rig.root.y - 14));
    } else rig.setExpr('slide');
    let bloomed = 0;
    let chainShown = false;
    const potStarts = [];
    let stopT = 0;
    let stopEv = null;
    for (const e of ev) {
      if (e.e === 'step' && !e.landing) {
        const to = this.anchor(e.cell);
        tl.track({ target: rig.root, t0: t, t1: t + ms, x0: pos.x, y0: pos.y, x1: to.x, y1: to.y });
        t += ms; pos = to;
        const cell = e.cell;
        tl.cue(t, () => { rig.root.setDepth(this.base + 8); });
      } else if (e.e === 'step' && e.landing) {
        // 착지 칸: 위치는 jump 트랙이 이미 옮겼다
      } else if (e.e === 'bloom') {
        bloomed += 1;
        const order = e.order;
        const tt = t;
        tl.cue(tt, () => { this.bloom(e.bud, order); rig.setExpr('smile'); rig.pop(); sc.time.delayedCall(CONFIG.dewBloomSmileMs, () => { if (rig.expr === 'smile' && !this.finished) rig.setExpr('slide'); }); });
        if (order === CONFIG.chainBloomMinCount && !chainShown) {
          chainShown = true;
          tl.cue(tt, () => this.onChain && this.onChain(rig.root.x, rig.root.y - 60, res.bloomedNow));
        }
      } else if (e.e === 'iceStep') {
        const tt = t; tl.cue(tt, () => this.iceCrack(e.cell));
      } else if (e.e === 'turn') {
        const tt = t;
        tl.cue(tt, () => { curDir = e.dir; slideDir(e.dir); rig.turnPress(); rig.stretch(horiz(e.dir)); this.leafShake(e.cell); sfx.arrowTurn(); });
      } else if (e.e === 'leafSame') {
        const tt = t; tl.cue(tt, () => this.leafShake(e.cell));
      } else if (e.e === 'teleport') {
        const to = this.anchor(e.to);
        const tt = t;
        tl.cue(tt, () => { rig.setExpr('closed'); sc.tweens.add({ targets: rig.root, scale: 0.2, duration: M.dewTeleport, ease: E.dewTeleport }); sfx.teleport(); this.petalPulse(e.from); });
        tl.cue(tt + M.dewTeleport, () => { rig.root.setPosition(to.x, to.y); this.petalPulse(e.to); });
        tl.cue(tt + M.dewTeleport + 1, () => { sc.tweens.add({ targets: rig.root, scale: 1, duration: M.dewTeleport, ease: E.dewTeleport, onComplete: () => rig.setExpr('slide') }); });
        t += M.dewTeleport * 2; pos = to;
      } else if (e.e === 'jump') {
        const to = this.anchor(e.to);
        const tt = t;
        tl.cue(tt, () => { this.mushBounce(e.from); rig.setExpr('hop'); sfx.mushroomJump(); });
        tl.track({ target: rig.root, t0: tt, t1: tt + CONFIG.jumpArcMs, x0: pos.x, y0: pos.y, x1: to.x, y1: to.y, arc: CONFIG.dewJumpHeightPx });
        tl.cue(tt + CONFIG.jumpArcMs, () => rig.setExpr('slide'));
        t += CONFIG.jumpArcMs; pos = to;
      } else if (e.e === 'potPush') {
        potStarts.push({ e, t });
      } else if (e.e === 'acornSlide') {
        const c = this.acorns[e.i];
        const from = this.center(e.from); const to = this.center(e.to);
        const n = e.cells.length;
        const dur = Math.max(CONFIG.slideMinDurationMs, n * speed);
        tl.track({ target: c, t0: 0, t1: dur, x0: from.x, y0: from.y, x1: to.x, y1: to.y });
        tl.cue(0, () => { sfx.acornRoll(); });
        tl.cue(dur, () => { sc.tweens.add({ targets: c.img, scale: { from: c.img.scaleX * 0.9, to: c.img.scaleX }, duration: M.acornSquash, ease: E.acornSquash }); });
        tl.cue(0, () => sc.tweens.add({ targets: c.img, angle: c.img.angle + ACORN_SPIN_DEG * n, duration: dur, ease: 'Linear' }));
      } else if (e.e === 'stop') {
        stopT = t; stopEv = e;
      }
    }
    // 화분 밀림: 이슬이 부딪힌 시각(stopT)에 출발
    let potEnd = 0;
    for (const { e } of potStarts) {
      const c = this.pots[e.i];
      const from = this.center(e.from); const to = this.center(e.to);
      const n = e.cells.length;
      const dur = Math.max(CONFIG.slideMinDurationMs, n * speed);
      tl.track({ target: c, t0: stopT, t1: stopT + dur, x0: from.x, y0: from.y, x1: to.x, y1: to.y });
      tl.cue(stopT, () => { sfx.potPush(); this.burst('dust', 3, from.x, from.y + 24); });
      tl.cue(stopT + dur, () => sc.tweens.add({ targets: c.img, scaleX: { from: c.img.scaleX * 0.94, to: c.img.scaleX }, scaleY: { from: c.img.scaleY * 0.94, to: c.img.scaleY }, duration: M.potStop, ease: E.potStop }));
      potEnd = Math.max(potEnd, stopT + dur + M.potStop);
    }
    let acornEnd = 0;
    for (const e of ev) if (e.e === 'acornSlide') acornEnd = Math.max(acornEnd, Math.max(CONFIG.slideMinDurationMs, e.cells.length * speed) + M.acornSquash);
    // 멈춤: 정면 몸통 + 스쿼시 + 톡 (F3)
    const dewEnd = Math.max(t, 0);
    if (movedDew) {
      tl.cue(dewEnd, () => { rig.setDir('down'); rig.setGaze(0, 0); rig.setExpr('smile'); rig.stopSquash(horiz(curDir)); sfx.wall(); });
      if (stopEv && stopEv.bump) tl.cue(dewEnd, () => this.bump(stopEv.bump, stopEv.target !== undefined ? stopEv.target : -1, curDir));
    } else if (stopEv && stopEv.bump) {
      // 이슬이 못 움직이고 화분/도토리만 움직인 이동(R30, R31)
      tl.cue(0, () => { rig.setDir('down'); rig.setExpr('smile'); });
    }
    // 마무리: 얼음 깨짐, 흙 무너짐, 개구리 순찰 (모든 것이 멈춘 뒤)
    const tFin = Math.max(dewEnd + M.dewStopSquash, potEnd, acornEnd) + 40;
    let tAll = tFin;
    for (const e of ev) {
      if (e.e === 'iceBreak') {
        const idx = this.level.iceAt[e.cell];
        tl.cue(tFin, () => this.breakIce(idx));
        tAll = Math.max(tAll, tFin + M.iceBreak);
      } else if (e.e === 'dirtCrumble') {
        const idx = this.level.dirtAt[e.cell];
        tl.cue(tFin, () => this.crumbleDirt(idx));
        tAll = Math.max(tAll, tFin + M.dirtCrumble);
      } else if (e.e === 'frogHop') {
        tl.cue(tFin, () => this.frogHop(e.i, e.from, e.to));
        tAll = Math.max(tAll, tFin + M.frogHop + M.frogLand);
      } else if (e.e === 'frogStay') {
        tl.cue(tFin, () => { const f = this.frogs[e.i]; sc.tweens.add({ targets: f.img, x: f.img.x + 2, duration: 30, yoyo: true, repeat: 1 }); });
      }
    }
    tl.dur = Math.max(tl.dur, tAll);
    this.finished = false;
    this.timeline = tl;
    tl.run(() => { this.timeline = null; this.state = res.state; if (done) done(); });
    return tl;
  }

  breakIce(idx) {
    const im = this.ices[idx];
    if (!im) return;
    const sc = this.scene;
    im.broken = true;
    sfx.ice();
    const c = this.center(im.cell);
    this.burst('shard', 5, c.x, c.y);
    const pud = sc.add.image(c.x, c.y, 'puddle').setDisplaySize(80, 80).setAlpha(0).setDepth(DEPTH.mid + 4);
    sc.tweens.add({ targets: pud, alpha: 1, duration: M.iceBreak, onComplete: () => { im.setTexture('puddle').setDisplaySize(80, 80).setAlpha(1); pud.destroy(); this.puddleRings[idx].setVisible(true); } });
    sc.tweens.add({ targets: im, scale: 0, alpha: 0, duration: M.iceBreak, ease: E.iceBreak, onComplete: () => { im.setScale(im.scaleX); } });
    // scale 0 은 이후 puddle 텍스처에서 되돌린다
    sc.time.delayedCall(M.iceBreak + 20, () => { im.setTexture('puddle').setDisplaySize(80, 80).setAlpha(1); });
  }
  crumbleDirt(idx) {
    const im = this.dirts[idx];
    if (!im) return;
    sfx.dirtCrumble();
    const c = this.center(im.cell);
    this.burst('crumb', 6, c.x, c.y);
    this.scene.tweens.add({ targets: im, scale: 0, duration: M.dirtCrumble, ease: E.dirtCrumble, onComplete: () => im.setVisible(false) });
  }
  frogHop(i, from, to) {
    const f = this.frogs[i];
    const a = this.center(from); const b = this.center(to);
    const sc = this.scene;
    sfx.frog();
    if (b.x !== a.x) f.img.scaleX = Math.abs(f.img.scaleX) * (b.x > a.x ? 1 : -1);
    const tr = { k: 0 };
    sc.tweens.add({
      targets: tr, k: 1, duration: M.frogHop, ease: E.frogHop,
      onUpdate: () => f.setPosition(a.x + (b.x - a.x) * tr.k, a.y + (b.y - a.y) * tr.k - Math.sin(tr.k * Math.PI) * 14),
      onComplete: () => { f.setPosition(b.x, b.y); f.cell = to; f.setDepth(this.base + Math.floor(to / COLS) * 0.1); sc.tweens.add({ targets: f.img, scaleY: { from: f.bs * 0.85, to: f.bs }, duration: M.frogLand, ease: E.frogLand }); }
    });
  }

  // ---- 되돌리기/힌트 되감기/다시 시작: 현재 시각적 상태에서 state 로 ms 안에 맞춘다 ----
  syncTo(state, dew, ms, done) {
    const sc = this.scene;
    const lv = this.level;
    if (this.timeline) this.timeline.stop();
    const tween = (target, x, y) => sc.tweens.add({ targets: target, x, y, duration: ms, ease: E.undo });
    const dp = this.anchor(state.dew);
    sc.tweens.killTweensOf(dew.root);
    dew.root.setScale(1);
    dew.setDir('down'); dew.setExpr('smile'); dew.setGaze(0, 0);
    tween(dew.root, dp.x, dp.y);
    this.pots.forEach((c, i) => { const p = this.center(state.pot[i]); tween(c, p.x, p.y); c.cell = state.pot[i]; });
    this.acorns.forEach((c, i) => { const p = this.center(state.acorn[i]); tween(c, p.x, p.y); c.cell = state.acorn[i]; });
    this.frogs.forEach((c, i) => { const cell = lv.frogs[i].path[state.frog[i * 2]]; const p = this.center(cell); tween(c, p.x, p.y); c.cell = cell; });
    this.buds.forEach((b, i) => { const want = (state.bloom >> i) & 1; if (want && b.stage < 3) { this.setBloomStage(b, 3, true); } else if (!want && b.stage > 0) this.unbloom(i, ms); });
    this.ices.forEach((im, i) => {
      const broken = (state.broken >> i) & 1;
      im.broken = !!broken;
      sc.tweens.killTweensOf(im);
      im.setScale(1).setTexture(broken ? 'puddle' : 'ice').setDisplaySize(80, 80).setAlpha(1);
      this.puddleRings[i].setVisible(!!broken);
    });
    this.dirts.forEach((im, i) => {
      const gone = (state.collapsed >> i) & 1;
      sc.tweens.killTweensOf(im);
      im.setTexture('dirt').setDisplaySize(80, 80).setVisible(!gone).setAlpha(1);
    });
    this.state = state;
    sc.time.delayedCall(ms + 20, () => { this.snapDepths(state); if (done) done(); });
  }
  snapDepths(state) {
    this.pots.forEach((c, i) => c.setDepth(this.base + Math.floor(state.pot[i] / COLS) * 0.1));
    this.acorns.forEach((c, i) => c.setDepth(this.base + Math.floor(state.acorn[i] / COLS) * 0.1));
  }

  // 클리어 연출: 판 글로우 + 꽃잎 30개 (F6)
  clearFx() {
    const sc = this.scene;
    const f = G.frame;
    this.burst('clear', Math.min(30, limits().boardParticles / 2), f.x + f.w / 2, f.y + f.h / 2);
    const fx = glowSprite(sc, this.frame, 'gold');
    sc.time.delayedCall(M.clearToResult, () => fx.destroy());
  }

  destroy() {
    if (this.timeline) this.timeline.stop();
    for (const tw of this.tweens) tw.remove();
    this.tweens = [];
  }
}
