// 정원 주민 (R37, plan 3-6, 3-12-3): 적용 중 스킨의 이슬 캐릭터 1명과 가진 꽃 친구(최대 5)가 빈 칸으로 2~5초마다 600ms 깡총 이동한다.
// 판정, 보상과 무관한 장식이다. 영지 안이고 물건이 없는 상하좌우 이웃 칸으로만 간다. 탭하면 점프와 하트(F40).
import { THEME } from '../theme.js';
import { CONFIG } from '../config.js';
import { DewRig } from '../ui/dew.js';
import { FRIENDS } from '../catalog.js';
import { sfx } from '../audio.js';
import { limits } from '../perf.js';
import { residentDepth } from './geom.js';
import { lerpColor } from './items.js';

const M = THEME.motionMs;
const E = THEME.easing;
// 칸 좌표 이웃과 화면 방향: 등각 2:1 대각선은 가로 성분이 커서 모두 왼쪽/오른쪽으로 본다 (x+1, y-1 은 오른쪽, y+1, x-1 은 왼쪽)
const DIRS = [[0, -1, 'right'], [1, 0, 'right'], [0, 1, 'left'], [-1, 0, 'left']];
const hex = (s) => parseInt(s.slice(1), 16);
const FRIEND_PX = THEME.garden.items.friendPx;
const DEW_BOX = THEME.dew.imageBoxPx.garden;

export class Residents {
  // isFree(x, y): 물건 층이 비어 있는 영지 안의 칸인지. fx: 공용 입자
  constructor(scene, view, isFree, fx, skin) {
    this.scene = scene;
    this.view = view;
    this.isFree = isFree;
    this.fx = fx;
    this.list = [];
    this.night = false;
    this.skin = skin;
    this.stopped = false;
    this.makeDew();
    for (const id of scene.friendIds) this.makeFriend(id);
    this.assignMovers();
  }

  freeTiles() {
    const out = [];
    for (let y = 0; y < this.view.n; y++) for (let x = 0; x < this.view.n; x++) if (this.isFree(x, y) && !this.occupiedByResident(x, y)) out.push([x, y]);
    return out;
  }
  occupiedByResident(x, y, except) { return this.list.some((r) => r !== except && Math.round(r.pos.x) === x && Math.round(r.pos.y) === y); }

  startTile() {
    const free = this.freeTiles();
    if (!free.length) return null;
    return free[Math.floor(Math.random() * free.length)];
  }

  makeDew() {
    const t = this.startTile();
    const rig = new DewRig(this.scene, { box: DEW_BOX, skin: this.skin, shadow: true });
    rig.setExpr('idle').startBreath().startBlink();
    const r = { type: 'dew', id: 'dew', rig, obj: rig.root, pos: t ? { x: t[0], y: t[1] } : { x: -3, y: this.view.n + 2 }, moving: false, mover: false, off: !t };
    this.list.push(r);
    this.place(r);
  }
  makeFriend(id) {
    const t = this.startTile();
    const cont = this.scene.add.container(0, 0);
    const im = this.scene.add.image(0, 0, id).setOrigin(0.5, 0.86).setDisplaySize(FRIEND_PX, FRIEND_PX);
    im.bs = im.scaleX;
    cont.add(im);
    const r = { type: 'friend', id, img: im, obj: cont, pos: t ? { x: t[0], y: t[1] } : { x: -3, y: this.view.n + 2 }, moving: false, mover: false, off: !t };
    this.scene.tweens.add({ targets: im, scaleX: im.bs * 1.03, scaleY: im.bs * 1.03, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 1800 });
    r.tint = im;
    this.list.push(r);
    this.place(r);
  }

  // 움직일 수 있는 주민 수 제한(저사양: 2명). 나머지는 서 있는다
  assignMovers() {
    const cap = limits().residents;
    this.list.forEach((r, i) => { r.mover = i < cap; });
    this.list.forEach((r) => { if (r.mover && !r.timer && !r.off) this.schedule(r); });
  }

  schedule(r) {
    const wait = Phaser.Math.Between(CONFIG.gardenWanderIdleMinMs, CONFIG.gardenWanderIdleMaxMs);
    r.timer = this.scene.time.delayedCall(wait, () => { r.timer = null; if (this.stopped) return; this.step(r); if (r.mover) this.schedule(r); });
  }

  // 이웃 칸 하나를 골라 600ms 깡총 (R37). 갈 곳이 없으면 쉰다
  step(r) {
    if (r.moving || r.off) return;
    const cx = Math.round(r.pos.x); const cy = Math.round(r.pos.y);
    const opts = DIRS.map(([dx, dy, name]) => ({ x: cx + dx, y: cy + dy, name })).filter((o) => this.isFree(o.x, o.y) && !this.occupiedByResident(o.x, o.y, r));
    if (!opts.length) return;
    const o = opts[Math.floor(Math.random() * opts.length)];
    this.hopTo(r, o.x, o.y, o.name, M.dewGardenHop);
  }

  hopTo(r, tx, ty, dir, ms) {
    const sc = this.scene;
    r.moving = true;
    const fx = r.pos.x; const fy = r.pos.y;
    const height = r.type === 'dew' ? CONFIG.dewGardenHopHeightPx : 12;
    const k = { v: 0 };
    if (r.rig) { r.rig.setDir(this.screenDir(dir)); r.rig.setGaze(0, 0); r.rig.stopBreath(); }
    r.hop = 0;
    sc.tweens.add({
      targets: k, v: 1, duration: ms, ease: E.dewGardenHop,
      onUpdate: () => { r.pos.x = fx + (tx - fx) * k.v; r.pos.y = fy + (ty - fy) * k.v; r.hop = Math.sin(k.v * Math.PI) * height; this.place(r); },
      onComplete: () => {
        r.pos.x = tx; r.pos.y = ty; r.hop = 0; r.moving = false; this.place(r);
        // 착지 스쿼시 100ms
        if (r.rig) { r.rig.setDir('down'); r.rig.scaleTo(1.08, 0.9, M.dewGardenLand / 2, E.dewGardenLand, () => r.rig.startBreath()); }
        else sc.tweens.add({ targets: r.img, scaleY: { from: r.img.bs * 0.88, to: r.img.bs }, duration: M.dewGardenLand, ease: E.dewGardenLand });
      }
    });
  }

  // 칸 좌표의 이웃 방향 -> 화면 방향 (등각 변환: 칸 +x 는 화면 오른쪽 아래, +y 는 왼쪽 아래)
  screenDir(d) { return d; }

  // 위치 갱신: 칸 중심 + 깡총 높이
  place(r) {
    const v = this.view;
    const vt = v.vertex(r.pos.x, r.pos.y);
    const s = v.toScreen(vt.x, vt.y + 16);
    const z = v.zoom;
    r.obj.setPosition(s.x, s.y - (r.hop || 0) * z);
    r.obj.setScale(z);
    r.obj.setDepth(residentDepth(Math.round(r.pos.x), Math.round(r.pos.y)) + 0.05);
  }
  applyView() { for (const r of this.list) this.place(r); }

  // 물건이 주민이 선 칸에 놓이면 가장 가까운 빈 칸으로 즉시 깡총
  evict() {
    for (const r of this.list) {
      if (r.off || r.moving) continue;
      const x = Math.round(r.pos.x); const y = Math.round(r.pos.y);
      if (this.isFree(x, y)) continue;
      let best = null; let bd = 1e9;
      for (const [tx, ty] of this.freeTiles()) { const d = Math.abs(tx - x) + Math.abs(ty - y); if (d < bd) { bd = d; best = [tx, ty]; } }
      if (best) this.hopTo(r, best[0], best[1], 'down', 220);
    }
  }

  tap(r) {
    if (r.tapping) return;
    r.tapping = true;
    const sc = this.scene;
    sfx.residentTap();
    if (r.rig) { r.rig.setExpr('hop'); sc.time.delayedCall(M.residentTap + 80, () => { if (r.rig) r.rig.setExpr('idle'); }); }
    const k = { v: 0 };
    sc.tweens.add({ targets: k, v: 1, duration: M.residentTap, ease: E.residentTap, onUpdate: () => { r.hop = Math.sin(k.v * Math.PI) * 20; this.place(r); }, onComplete: () => { r.hop = 0; r.tapping = false; this.place(r); } });
    if (this.fx && this.fx.heart) { const p = this.view.toScreen(0, 0); this.fx.heart.explode(3, r.obj.x, r.obj.y - 30 * this.view.zoom); }
  }

  // 화면 위치(sx, sy) 근처의 주민
  hit(sx, sy) {
    const z = this.view.zoom;
    let best = null; let bd = 1e9;
    for (const r of this.list) {
      if (r.off) continue;
      const dx = sx - r.obj.x; const dy = sy - (r.obj.y - 20 * z);
      const d = Math.hypot(dx, dy);
      if (d < 34 * z + 10 && d < bd) { bd = d; best = r; }
    }
    return best;
  }

  setNight(night, ms) {
    if (this.night === night) return;
    this.night = night;
    const to = night ? hex(THEME.tint.friendNight) : 0xffffff;
    const from = night ? 0xffffff : hex(THEME.tint.friendNight);
    for (const r of this.list) {
      const target = r.rig ? r.rig.body : r.img;
      if (r.rig && r.rig.neutral) continue; // 색 스킨의 색조를 건드리지 않는다
      const k = { v: 0 };
      if (!ms) { target.setTint(to); continue; }
      this.scene.tweens.add({ targets: k, v: 1, duration: ms, ease: E.skyFade, onUpdate: () => target.setTint(lerpColor(from, to, k.v)) });
    }
  }

  destroy() {
    this.stopped = true;
    for (const r of this.list) { if (r.timer) r.timer.remove(); if (r.rig) r.rig.destroy(); else r.obj.destroy(); }
    this.list = [];
  }
}
