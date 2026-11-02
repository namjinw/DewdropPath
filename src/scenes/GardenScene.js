// S6 garden (R36, R37, R44~R47, F36~F41, F46~F51): 아이소메트릭 영지 + 한국 시각 하늘(낮/밤) + 건물 3상태 + 주민 + 꾸미기(끌어 놓기).
// 보기 변환(확대 1.0/0.6, 이동)은 GardenView 가 정하고 모든 세계 오브젝트가 같은 규칙으로 위치와 크기를 맞춘다.
import { THEME } from '../theme.js';
import { CONFIG, TEST_CLOCK } from '../config.js';
import { t } from '../i18n/index.js';
import { GardenView, TW, TH, PIVOT } from '../garden/geom.js';
import { PlacedItem, periodTint, lerpColor } from '../garden/items.js';
import { GardenSky } from '../garden/sky.js';
import { Residents } from '../garden/residents.js';
import { ClipView } from '../ui/clipview.js';
import { button, panel, text, image, chip, bubble, toast, go, fadeIn, DEPTH, nudge, hex, coinPill } from '../ui/kit.js';
import { topBar } from '../ui/common.js';
import { ITEMS, FRIENDS, isBuilding, itemTexture } from '../catalog.js';
import { ALL_GARDEN_IMAGES, ensureImages, sceneAlive, itemImages, GARDEN_EXTRA } from '../assets.js';
import { bake, ART_SCALE, bakeGardenTexture } from '../art.js';
import { currentPeriod, kstMinutes, starCountFor } from '../clock.js';
import { limits } from '../perf.js';
import * as save from '../save.js';
import * as wallet from '../wallet.js';
import { sfx } from '../audio.js';

const G = THEME.garden;
const L = THEME.layout.garden;
const M = THEME.motionMs;
const E = THEME.easing;
const P = THEME.palette;
const PERIODS = ['dawn', 'day', 'dusk', 'night'];
const UI = THEME.depth.gardenUi; // 300
const PLOT_COLORS = G.plot;

// 영지 바닥 텍스처: 체커 윗면 + 두 옆면 + 흙 띠 + 그림자 (n x n). 위쪽 꼭짓점이 (originX, pad)
function bakePlot(scene, n) {
  const key = `plot_${n}`;
  const pad = 36;
  const w = n * TW + pad * 2;
  const grassD = PLOT_COLORS.grassDepthPx;
  const soilD = PLOT_COLORS.soilDepthPx;
  const h = n * TH + grassD + soilD + 50 + pad;
  const info = { key, ox: w / 2, oy: pad, w, h };
  if (scene.textures.exists(key)) return info;
  const scale = n > 12 ? 1 : ART_SCALE;
  bake(scene, key, w, h, (ctx) => {
    const top = (x, y) => [w / 2 + (x - y) * (TW / 2), pad + (x + y) * (TH / 2)];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const [tx, ty] = top(x, y);
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + TW / 2, ty + TH / 2); ctx.lineTo(tx, ty + TH); ctx.lineTo(tx - TW / 2, ty + TH / 2); ctx.closePath();
        ctx.fillStyle = (x + y) % 2 ? PLOT_COLORS.topB : PLOT_COLORS.topA; ctx.fill();
        ctx.strokeStyle = PLOT_COLORS.tileLine; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    const [lx, ly] = top(0, n); const [bx, by] = top(n, n); const [rx, ry] = top(n, 0);
    const face = (x0, y0, x1, y1, dy0, dy1, col) => { ctx.beginPath(); ctx.moveTo(x0, y0 + dy0); ctx.lineTo(x1, y1 + dy0); ctx.lineTo(x1, y1 + dy1); ctx.lineTo(x0, y0 + dy1); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); };
    face(lx, ly, bx, by, 0, grassD, PLOT_COLORS.sideLeft);
    face(bx, by, rx, ry, 0, grassD, PLOT_COLORS.sideRight);
    face(lx, ly, bx, by, grassD, grassD + soilD, PLOT_COLORS.soilLeft);
    face(bx, by, rx, ry, grassD, grassD + soilD, PLOT_COLORS.soilRight);
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(bx, by); ctx.lineTo(rx, ry); ctx.strokeStyle = PLOT_COLORS.rim; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
  }, scale);
  // 바닥 그림자는 별도의 타원으로 맨 아래에 깐다 (plot 이미지와 같은 좌표계)
  return info;
}

export default class GardenScene extends Phaser.Scene {
  constructor() { super('Garden'); }

  init(data) { this.from = (data && data.from) || 'Menu'; }

  create() {
    fadeIn(this);
    this.testHooks = {};
    this.g = save.getGarden();
    this.view = new GardenView(this.g.plot);
    this.view.pan.x = this.g.cam.x; this.view.pan.y = this.g.cam.y;
    this.view.clampPan();
    this.period = currentPeriod();
    this.friendIds = this.g.friends.slice();
    this.items = [];
    this.edit = false;
    this.selected = null;
    this.drag = null;
    this.press = null;
    this.coach = null; this.coachKey = null; this.editPulse = false; this.trayCards = []; this.trayView = null; this.trayLayer = null;
    this.timeBadge = null; this.sky = null; this.residents = null; this.selUi = null; this.emptyText = null; this.moreDisc = null; this.drag = null;
    this.zoomTween = null;
    const keys = [...GARDEN_EXTRA, ...this.friendIds];
    for (const p of this.g.placed) keys.push(...itemImages(p.id));
    for (const id of Object.keys(this.g.tray)) keys.push(...itemImages(id));
    const loading = text(this, 270, 480, t('common.loading'), { size: 24, color: P.textDim }).setDepth(UI);
    ensureImages(this, keys, () => { loading.destroy(); if (sceneAlive(this)) this.setup(); });
  }

  setup() {
    const g = this.g;
    const D = UI;
    this.sky = new GardenSky(this, this.period);
    this.buildPlot();
    this.makeEmitters();
    // 놓인 아이템 (저장 복원: 모든 건물은 완공 상태, 연출 없이 현재 시간대로)
    for (const rec of g.placed) this.addItem(rec, false);
    this.residents = new Residents(this, this.view, (x, y) => this.freeObjectTile(x, y), this.fx, save.appliedSkin());
    this.applyPeriodNow(this.period);
    this.buildHud();
    this.applyAllViews();
    this.setupInput();
    this.startTimers();
    this.maybeCoach();
    this.events.once('shutdown', () => { this.view && this.saveCam(); });
    // 영지가 늘어난 직후라면 새 칸이 솟아오르는 연출 (F41)
    const seen = this.registry.get('gardenPlotSeen');
    if (seen !== undefined && g.plot > seen) this.plotGrowFx();
    this.registry.set('gardenPlotSeen', g.plot);
    this.onVis = () => { if (!document.hidden && this.sky) this.syncClock(CONFIG.gardenReturnFadeMs); };
    document.addEventListener('visibilitychange', this.onVis);
    this.events.once('shutdown', () => document.removeEventListener('visibilitychange', this.onVis));
  }

  // ---- 영지 바닥 ----
  buildPlot() {
    const info = bakePlot(this, this.view.n);
    this.plotInfo = info;
    const sc = this.textures.get(info.key).getSourceImage().width / info.w;
    this.plot = this.add.image(0, 0, info.key).setOrigin(info.ox / info.w, info.oy / info.h).setDepth(THEME.depth.gardenBase - 5);
    this.plotBase = 1 / (sc === 0 ? 1 : sc);
    this.plot.setTint(periodTint(this.period));
    this.plotShadow = this.add.ellipse(0, 0, 10, 10, 0x141e3c, 0.18).setDepth(THEME.depth.gardenBase - 6);
  }

  makeEmitters() {
    const cap = limits().particles;
    const mk = (key, cfg) => this.add.particles(0, 0, key, { emitting: false, maxAliveParticles: Math.max(4, Math.round(cap / 4)), ...cfg }).setDepth(UI - 1);
    this.fx = {
      dust: mk('p_dust', { lifespan: CONFIG.buildDustLifeMs, speedY: -14 / (CONFIG.buildDustLifeMs / 1000), scale: { start: 0.5, end: 1.2 }, alpha: { start: 0.6, end: 0 } }),
      spark: mk('p_spark', { lifespan: CONFIG.buildSparkleLifeMs, speed: { min: 20, max: 70 }, angle: { min: 200, max: 340 }, scale: { start: 0.9, end: 0 }, alpha: { start: 1, end: 0 }, blendMode: 'ADD' }),
      heart: mk('p_heart', { lifespan: 700, speed: { min: 20, max: 50 }, angle: { min: 230, max: 310 }, scale: { start: 0.8, end: 1.1 }, alpha: { start: 1, end: 0 } }),
      leaf: mk('p_leaf', { lifespan: 500, speed: { min: 20, max: 60 }, gravityY: 120, scale: { start: 0.9, end: 0.4 }, alpha: { start: 1, end: 0 } })
    };
  }

  // ---- 물건 ----
  addItem(rec, fresh) {
    const it = new PlacedItem(this, this.view, rec, { period: this.period, fx: this.fx });
    it.setPeriod(this.period, 0, 0, true);
    if (!fresh && it.isBuilding) it.startIdle();
    this.items.push(it);
    return it;
  }
  itemAt(x, y) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (this.drag && this.drag.item === it) continue;
      if (it.footprint.some(([fx, fy]) => fx === x && fy === y)) return it;
    }
    return null;
  }
  // 칸의 물건 층이 비어 있는지 (건물, 장식). 바닥은 물건 층을 쓰지 않는다
  freeObjectTile(x, y) {
    if (x < 0 || y < 0 || x >= this.view.n || y >= this.view.n) return false;
    for (const it of this.items) { if (it.item.kind === 'ground') continue; if (this.drag && this.drag.item === it) continue; if (it.footprint.some(([fx, fy]) => fx === x && fy === y)) return false; }
    return true;
  }
  freeGroundTile(x, y) {
    for (const it of this.items) { if (it.item.kind !== 'ground') continue; if (this.drag && this.drag.item === it) continue; if (it.rec.x === x && it.rec.y === y) return false; }
    return true;
  }
  canPlace(id, x, y) {
    const it = ITEMS[id];
    const size = it.size;
    if (!this.view.inside(x, y, size)) return false;
    for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) {
      if (it.kind === 'ground') { if (!this.freeGroundTile(x + i, y + j)) return false; } else if (!this.freeObjectTile(x + i, y + j)) return false;
    }
    return true;
  }

  // ---- 보기 변환 ----
  applyAllViews() {
    const v = this.view;
    const info = this.plotInfo;
    const o = v.toScreen(v.origin.x, v.origin.y);
    this.plot.setPosition(o.x, o.y).setScale(v.zoom * this.plotBase);
    const n = v.n;
    const bv = v.vertex(n, n);
    const bs = v.toScreen(bv.x, bv.y + PLOT_COLORS.grassDepthPx + PLOT_COLORS.soilDepthPx + 26);
    this.plotShadow.setPosition(bs.x, bs.y).setSize(n * TW * 0.9 * v.zoom, 60 * v.zoom).setDisplaySize(n * TW * 0.9 * v.zoom, 60 * v.zoom);
    for (const it of this.items) it.applyView();
    if (this.residents) this.residents.applyView();
    if (this.drag) this.drawPreview();
    this.placeSelectionUi();
    for (const it of this.items) it.setParticlesOff(v.zoom < 0.7 || it.budgetPaused);
  }

  // ---- 시간대 ----
  getPeriod() { return currentPeriod(); }
  applyPeriodNow(p) {
    this.period = p;
    this.sky.setPeriod(p, 0);
    this.plot.setTint(periodTint(p));
    for (const it of this.items) it.setPeriod(p, 0, 0, true);
    this.residents.setNight(p === 'night', 0);
    this.updateTimeBadge();
    this.sky.setStarCount(starCountFor(kstMinutes()) ? Math.min(limits().stars, starCountFor(kstMinutes())) : 0, 0);
  }
  syncClock(ms) {
    const p = this.getPeriod();
    if (p !== this.period) this.transition(p, ms);
    const stars = starCountFor(kstMinutes());
    const target = stars ? Math.min(limits().stars, stars) : 0;
    if (target !== this.sky.starCount) this.sky.setStarCount(target, M.skyFade);
  }
  // 하늘, 바닥, 장식 3000ms, 건물 이미지 1500ms(건물마다 100ms 시차, 최대 600ms) (F49)
  transition(p, ms = M.skyFade) {
    const from = this.period;
    this.period = p;
    this.sky.setPeriod(p, ms);
    const a = periodTint(from); const b = periodTint(p);
    const k = { v: 0 };
    this.tweens.add({ targets: k, v: 1, duration: ms, ease: E.skyFade, onUpdate: () => this.plot.setTint(lerpColor(a, b, k.v)) });
    const bFade = ms === M.skyFade ? M.buildingFade : Math.min(ms, M.buildingFade);
    const order = this.items.filter((it) => it.isBuilding).sort((x, y) => Math.hypot(x.screen.x - 270, x.screen.y - 480) - Math.hypot(y.screen.x - 270, y.screen.y - 480));
    order.forEach((it, i) => it.setPeriod(p, bFade, Math.min(i * M.buildingFadeStagger, 600), false));
    for (const it of this.items) if (!it.isBuilding) it.setPeriod(p, ms, 0, false);
    this.residents.setNight(p === 'night', ms);
    this.updateTimeBadge();
  }
  updateTimeBadge() {
    if (!this.timeBadge) return;
    const p = this.period;
    const names = { dawn: 'garden.timeDawn', day: 'garden.timeDay', dusk: 'garden.timeDusk', night: 'garden.timeNight' };
    this.timeText.setText(t('garden.timeLabel', { period: t(names[p]) }));
    const night = p === 'night';
    this.timeIcon.setTexture(night ? 'moon' : 'sun');
    this.timeIcon.setDisplaySize(32, 32);
    this.timeText.setColor(night ? '#FFF6DA' : P.ink);
    this.timeBg.setTexture(night ? 'timebadge_dark' : 'timebadge');
    this.layoutTimeBadge();
  }
  layoutTimeBadge() {
    const w = 8 + 32 + 6 + this.timeText.width + 16;
    this.timeBadge.setPosition(520 - w / 2, 118);
    const m = this.timeBg;
    // 알약 크기를 글자에 맞춘다
    const pad = 10; const sl = 32 * ART_SCALE;
    m.setSize((w + pad * 2) * ART_SCALE, (44 + pad * 2) * ART_SCALE);
    this.timeIcon.setPosition(-w / 2 + 8 + 16, 0);
    this.timeText.setPosition(-w / 2 + 8 + 32 + 6, -1);
  }

  // ---- HUD ----
  buildHud() {
    const bar = topBar(this, { back: 'Menu', coins: true });
    this.testHooks.backButton = bar.back;
    bar.back.setDepth(UI); bar.coins.setDepth(UI);
    this.plotChip = chip(this, 0, 53, t('garden.plotSize', { n: this.view.n }), { kind: 'white', size: 20, h: 42 }).setDepth(UI);
    this.plotChip.x = 164 + this.plotChip.w / 2;
    // 시간대 표시: 버튼이 아니라 표시만
    const night = this.period === 'night';
    this.timeBadge = this.add.container(0, 0).setDepth(UI);
    const pad = 10;
    this.timeBg = this.add.nineslice(0, 0, night ? 'timebadge_dark' : 'timebadge', undefined, 200 * ART_SCALE, (44 + pad * 2) * ART_SCALE, 32 * ART_SCALE, 32 * ART_SCALE, 32 * ART_SCALE, 32 * ART_SCALE).setScale(1 / ART_SCALE);
    this.timeIcon = this.add.image(0, 0, night ? 'moon' : 'sun').setDisplaySize(32, 32);
    this.timeText = text(this, 0, -1, '', { size: 20, color: P.ink, origin: 0 });
    this.timeBadge.add([this.timeBg, this.timeIcon, this.timeText]);
    this.updateTimeBadge();
    // 아래 막대 (보기 모드)
    this.viewBar = this.add.container(0, 0).setDepth(UI);
    const e = L.edit; const z = L.zoom; const s = L.shop;
    this.editBtn = button(this, { x: e[0] + e[2] / 2, y: e[1] + e[3] / 2, w: e[2], h: e[3], variant: 'primary', size: 26, label: t('garden.edit'), icon: 'b1_gardener_hut_day', iconSize: 44, onClick: () => this.setEdit(true) });
    this.zoomBtn = button(this, { x: z[0] + z[2] / 2, y: z[1] + z[3] / 2, w: z[2], h: z[3], variant: 'neutral', size: 20, label: t('garden.zoom'), code: 'zoom', iconSize: 30, col: true, onClick: () => this.toggleZoom() });
    this.shopBtn = button(this, { x: s[0] + s[2] / 2, y: s[1] + s[3] / 2, w: s[2], h: s[3], variant: 'secondary', size: 26, label: t('garden.toShop'), icon: 'coin', iconSize: 32, onClick: () => go(this, 'Shop', { from: 'Garden' }) });
    [this.editBtn, this.zoomBtn, this.shopBtn].forEach((b) => b.setDepth(UI));
    // 꾸미기 모드: 완료 버튼과 보관함
    const d = L.done;
    this.doneBtn = button(this, { x: d[0] + d[2] / 2, y: d[1] + d[3] / 2, w: d[2], h: d[3], variant: 'primary', size: 20, label: t('garden.done'), onClick: () => this.setEdit(false) }).setDepth(UI).setVisible(false);
    this.trayRoot = this.add.container(0, 0).setDepth(UI).setVisible(false);
    this.trayPanel = panel(this, L.tray[0], L.tray[1], L.tray[2], L.tray[3]);
    this.trayRoot.add(this.trayPanel);
    this.selUi = this.add.container(0, 0).setDepth(UI + 5).setVisible(false);
    this.flipBtn = button(this, { x: -62, y: 0, w: 116, h: 54, variant: 'neutral', size: 18, label: t('garden.flip'), code: 'flip', iconSize: 24, onClick: () => this.flipSelected(), depth: UI + 5 });
    this.storeBtn = button(this, { x: 84, y: 0, w: 176, h: 54, variant: 'neutral', size: 18, label: t('garden.store'), code: 'store', iconSize: 24, onClick: () => this.storeSelected(), depth: UI + 5 });
    this.selUi.add([this.flipBtn, this.storeBtn]);
    this.input.keyboard.on('keydown-ESC', () => { if (this.edit) this.setEdit(false); else bar.back.trigger(); });
  }

  // ---- 꾸미기 모드 ----
  setEdit(on) {
    if (this.edit === on) return;
    this.edit = on;
    sfx.click();
    this.deselect();
    this.viewBar.setVisible(!on);
    [this.editBtn, this.zoomBtn, this.shopBtn].forEach((b) => b.setVisible(!on));
    this.doneBtn.setVisible(on);
    this.trayRoot.setVisible(on);
    if (this.coach) { this.coach.destroy(); this.coach = null; }
    if (on) { this.buildTray(); if (!save.hasSeen('coach3')) this.showCoach('coach3', 'garden.coachDrag', 270, 700, { tail: 'down', w: 250, h: 56, tailAt: 0 }); save.markSeen('coach2'); }
    else { this.destroyTray(); }
    if (this.editPulse) { this.editBtn.setPulse(false); this.editPulse = false; }
  }

  trayEntries() {
    const g = this.g;
    return Object.keys(g.tray).filter((id) => g.tray[id] > 0 && ITEMS[id]).map((id) => ({ id, n: g.tray[id] }));
  }
  buildTray() {
    this.destroyTray();
    const entries = this.trayEntries();
    const [tx, ty, tw, th] = L.tray;
    this.trayView = new ClipView(this, { x: tx + 6, y: ty + 4, w: tw - 12, h: th - 8, axis: 'x' });
    this.trayLayer = this.add.container(0, 0);
    this.trayView.add(this.trayLayer);
    this.trayCards = [];
    if (!entries.length) {
      text(this, 270, ty + 86, t('garden.emptyTray'), { size: 20, color: P.text, maxW: 460 }).setDepth(UI + 3);
      this.emptyText = this.children.list[this.children.list.length - 1];
      this.trayView.setContentSize(tw);
      return;
    }
    entries.forEach((e, i) => {
      const x = L.trayItem.x + i * L.trayItem.step;
      const y = ty + 16;
      const c = this.add.container(x, y);
      c.add(panel(this, 0, 0, L.trayItem.w, L.trayItem.h, { flat: true }));
      const key = itemTexture(e.id);
      const baked = this.textures.exists(key) ? bakeGardenTexture(this, key, ITEMS[e.id].kind === 'ground' ? 'floor' : 'day') : key;
      const im = this.add.image(75, 44, baked);
      im.setScale(72 / Math.max(im.width, im.height));
      c.add(im);
      c.add(text(this, 75, 106, t('garden.trayItem', { name: t(ITEMS[e.id].nameKey), n: e.n }), { size: 16, color: P.ink, wrap: 140, maxW: 142, minSize: 12 }));
      c.cardId = e.id; c.cardX = x; c.cardY = y;
      this.trayLayer.add(c);
      this.trayCards.push(c);
    });
    this.trayView.setContentSize(24 + entries.length * L.trayItem.step + 20);
    if (entries.length * L.trayItem.step + 24 > tw - 20) {
      this.moreDisc = this.add.container(tx + tw - 26, ty + 86).setDepth(UI + 4);
      this.moreDisc.add([this.add.circle(0, 0, 16, 0xffffff, 0.92), this.add.image(1, 0, 'ui-extra-icon-play-dark').setDisplaySize(14, 16).setTint(hex(THEME.tint.inkFill.color)).setTintMode(Phaser.TintModes.FILL)]);
    }
  }
  destroyTray() {
    if (this.trayLayer) { this.trayLayer.destroy(); this.trayLayer = null; }
    if (this.emptyText) { this.emptyText.destroy(); this.emptyText = null; }
    if (this.moreDisc) { this.moreDisc.destroy(); this.moreDisc = null; }
    this.trayCards = [];
  }
  // 보관함 카드를 화면 좌표로 찾는다
  trayCardAt(px, py) {
    if (!this.trayView || !this.trayView.contains(px, py)) return null;
    for (const c of this.trayCards) {
      const sx = c.cardX - this.trayView.scroll;
      if (px >= sx && px <= sx + L.trayItem.w && py >= c.cardY && py <= c.cardY + L.trayItem.h) return c;
    }
    return null;
  }
  inTray(px, py) { const [tx, ty, tw, th] = L.tray; return px >= tx && px <= tx + tw && py >= ty && py <= ty + th; }

  // ---- 입력 ----
  setupInput() {
    const I = this.input;
    I.on('pointerdown', (p, over) => this.onDown(p, over));
    I.on('pointermove', (p) => this.onMove(p));
    I.on('pointerup', (p) => this.onUp(p));
    I.on('pointerout', () => { if (this.drag) this.cancelDrag(); });
    I.on('gameout', () => { if (this.drag) this.cancelDrag(); });
    I.on('wheel', (p, over, dx, dy) => { if (!this.edit || !this.inTray(p.x, p.y)) this.setZoom(dy > 0 ? CONFIG.gardenZoomFarRatio : CONFIG.gardenZoomNearRatio); });
  }
  tileUnder(px, py) {
    const c = this.view.tileAt(px, py);
    return { x: Math.floor(c.x), y: Math.floor(c.y), fx: c.x, fy: c.y };
  }
  onDown(p, over) {
    if (this.dragBlocked) return;
    if (over && over.length) { this.press = null; return; }
    this.press = { x: p.x, y: p.y, pan0: { x: this.view.pan.x, y: this.view.pan.y }, kind: 'pan', moved: false };
    if (this.edit) {
      const card = this.trayCardAt(p.x, p.y);
      if (card) { this.press.kind = 'tray'; this.press.card = card; this.press.scroll0 = this.trayView.scroll; return; }
      if (this.inTray(p.x, p.y)) { this.press.kind = 'trayBg'; return; }
    }
    const res = this.residents && !this.edit ? this.residents.hit(p.x, p.y) : null;
    const tile = this.tileUnder(p.x, p.y);
    const it = this.itemAtTile(tile.x, tile.y);
    if (it && it.constructing) { this.press.kind = 'building'; this.press.item = it; return; }
    if (this.edit && it) { this.press.kind = 'item'; this.press.item = it; return; }
    if (res) { this.press.kind = 'resident'; this.press.res = res; }
  }
  // 칸에 놓인 아이템: 물건 층(장식, 건물)이 바닥보다 우선한다
  itemAtTile(x, y) {
    let best = null;
    for (const it of this.items) {
      if (!it.footprint.some(([fx, fy]) => fx === x && fy === y)) continue;
      if (!best || (best.item.kind === 'ground' && it.item.kind !== 'ground')) best = it;
    }
    return best;
  }
  onMove(p) {
    if (!this.press || !p.isDown) return;
    const dx = p.x - this.press.x; const dy = p.y - this.press.y;
    const dist = Math.hypot(dx, dy);
    if (this.drag) { this.updateDrag(p); return; }
    if (dist < CONFIG.gardenDragThresholdPx && !this.press.moved) return;
    this.press.moved = true;
    const k = this.press.kind;
    if (k === 'tray') {
      if (dy < -CONFIG.gardenDragThresholdPx && Math.abs(dy) > Math.abs(dx)) this.startDragFromTray(this.press.card, p);
      else if (this.trayView) this.trayView.setScroll(this.press.scroll0 - dx);
      return;
    }
    if (k === 'trayBg') { if (this.trayView) this.trayView.setScroll(this.trayView.scroll - (p.x - (this.press.lx || this.press.x))); this.press.lx = p.x; return; }
    if (k === 'item') { this.startDragFromItem(this.press.item, p); return; }
    // 이동: 어디를 끌어도 카메라가 움직인다
    this.view.pan.x = this.press.pan0.x - dx / this.view.zoom;
    this.view.pan.y = this.press.pan0.y - dy / this.view.zoom;
    this.view.clampPan();
    this.applyAllViews();
    if (this.coach && this.coachKey === 'coach1') { this.coach.destroy(); this.coach = null; save.markSeen('coach1'); this.showCoach('coach2', 'garden.coachEdit', 150, 800, { tail: 'down', w: 300, h: 76, tailAt: -100 }); this.editBtn.setPulse(true); this.editPulse = true; }
  }
  onUp(p) {
    const press = this.press;
    this.press = null;
    if (this.drag) { this.endDrag(p); return; }
    if (!press) return;
    if (press.moved && press.kind === 'pan') { this.saveCam(); return; }
    if (press.moved) return;
    // 탭
    if (press.kind === 'building') { sfx.click(); press.item.tapBuilding(); toast(this, t('garden.building'), { kind: 'info', y: 680, ms: CONFIG.buildTapToastSec * 1000 }); return; }
    if (press.kind === 'resident') { this.residents.tap(press.res); return; }
    if (press.kind === 'item') { this.select(press.item); return; }
    if (press.kind === 'pan') this.deselect();
  }

  // ---- 끌어 놓기 (F36~F38) ----
  startDragFromTray(card, p) {
    const id = card.cardId;
    if (!ITEMS[id]) return;
    const rec = { id, x: -5, y: -5, flip: false };
    const item = new PlacedItem(this, this.view, rec, { period: this.period, fx: this.fx });
    item.setPeriod(this.period, 0, 0, true);
    card.setAlpha(0.45);
    this.drag = { from: 'tray', card, id, item, rec, lastValid: false, size: ITEMS[id].size, home: { sx: card.cardX - this.trayView.scroll + L.trayItem.w / 2, sy: card.cardY + 50 } };
    this.beginDragCommon(p);
  }
  startDragFromItem(item, p) {
    if (item.constructing) return;
    this.select(null);
    this.drag = { from: 'item', id: item.rec.id, item, rec: item.rec, size: ITEMS[item.rec.id].size, orig: { x: item.rec.x, y: item.rec.y } };
    this.beginDragCommon(p);
  }
  beginDragCommon(p) {
    sfx.gardenPick();
    this.drag.gfx = this.add.graphics().setDepth(UI - 3);
    this.drag.item.bob.y = -8;
    this.drag.item.container.setDepth(UI - 2);
    this.drag.ptr = p;
    if (this.coach && this.coachKey === 'coach3') { this.coach.destroy(); this.coach = null; save.markSeen('coach3'); }
    this.updateDrag(p);
  }
  // 손가락 아래 칸에 붙인다 (2x2 는 중심이 손가락에 오게)
  dragTile(p) {
    const c = this.view.tileAt(p.x, p.y - 20 * this.view.zoom);
    const s = this.drag.size;
    return s === 2 ? { x: Math.floor(c.x - 0.5), y: Math.floor(c.y - 0.5) } : { x: Math.floor(c.x), y: Math.floor(c.y) };
  }
  updateDrag(p) {
    const d = this.drag;
    d.ptr = p;
    const tl = this.dragTile(p);
    d.rec.x = tl.x; d.rec.y = tl.y;
    d.valid = !this.inTray(p.x, p.y) && this.canPlace(d.id, tl.x, tl.y);
    d.item.applyView();
    d.item.container.setDepth(UI - 2);
    this.drawPreview();
  }
  drawPreview() {
    const d = this.drag;
    if (!d || !d.gfx) return;
    const g = d.gfx;
    g.clear();
    if (this.inTray(d.ptr.x, d.ptr.y)) return;
    const ok = d.valid;
    const fill = ok ? 0x73D6AD : 0xF27896;
    const line = ok ? 0x2FB784 : 0xE0506A;
    const v = this.view;
    for (let i = 0; i < d.size; i++) for (let j = 0; j < d.size; j++) {
      const vt = v.vertex(d.rec.x + i, d.rec.y + j);
      const a = v.toScreen(vt.x, vt.y); const b = v.toScreen(vt.x + TW / 2, vt.y + TH / 2); const c = v.toScreen(vt.x, vt.y + TH); const e = v.toScreen(vt.x - TW / 2, vt.y + TH / 2);
      g.fillStyle(fill, 0.45).fillPoints([a, b, c, e], true);
      g.lineStyle(3, line, 1).strokePoints([a, b, c, e], true);
    }
  }
  cancelDrag() {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.finishFail(d, true);
  }
  endDrag(p) {
    const d = this.drag;
    this.drag = null;
    if (d.gfx) d.gfx.destroy();
    if (this.inTray(p.x, p.y)) { // 보관함에 놓으면 넣는다 (또는 되돌아간다)
      if (d.from === 'item') { this.storeItem(d.item); } else { this.finishFail(d, false, true); }
      return;
    }
    if (d.valid) this.dropOk(d);
    else this.finishFail(d, false);
  }
  dropOk(d) {
    const it = d.item;
    const g = this.g;
    if (d.from === 'tray') {
      g.tray[d.id] = (g.tray[d.id] || 1) - 1;
      if (g.tray[d.id] <= 0) delete g.tray[d.id];
      g.placed.push(d.rec);
      this.items.push(it);
      if (d.card) d.card.setAlpha(1);
    }
    it.bob.y = 0;
    it.applyView();
    sfx.gardenPlace();
    // 배치 스쿼시 150ms 와 풀잎 입자 4개 (F37)
    this.tweens.add({ targets: it.bob, scale: { from: 0.9, to: 1 }, duration: M.gardenPlace, ease: E.gardenPlace, onUpdate: () => it.applyView() });
    this.fx.leaf.explode(4, it.screen.x, it.screen.y - 8 * this.view.zoom);
    save.saveGarden();
    if (d.from === 'tray') {
      this.residents.evict();
      if (it.isBuilding) this.startBuilding(it);
      else if (it.item.kind !== 'ground') it.startIdle();
      this.buildTray();
    } else this.residents.evict();
  }
  startBuilding(it) {
    it.startBuild(() => this.onBuilt(it));
  }
  onBuilt() {
    if (save.getGardenNightHintSeen()) return;
    const night = this.period === 'night';
    save.setGardenNightHintSeen(); // 표시를 시작하는 즉시 저장
    if (night) return; // 첫 완공이 밤이면 창문 빛이 이미 보이므로 안내 없이 확인 처리
    const c = toast(this, t('garden.nightHint'), { kind: 'info', y: 690, ms: CONFIG.gardenNightHintSec * 1000 });
  }
  // 놓을 수 없음 (F38): 빨강 테두리가 깜빡이고 원래 자리로 200ms 돌아간다
  finishFail(d, silent, toTray) {
    if (d.gfx) { const g = d.gfx; this.tweens.add({ targets: g, alpha: { from: 1, to: 0.2 }, duration: 70, yoyo: true, repeat: 1, onComplete: () => g.destroy() }); }
    const it = d.item;
    if (!silent && !toTray) { sfx.gardenFail(); toast(this, t('garden.cantPlace'), { kind: 'warn', y: 706 }); }
    const done = () => {
      if (d.from === 'tray') { it.destroy(); if (d.card) d.card.setAlpha(1); }
      else { it.rec.x = d.orig.x; it.rec.y = d.orig.y; it.bob.y = 0; it.applyView(); }
    };
    const back = { v: 0 };
    if (d.from === 'item') {
      const sx = it.rec.x; const sy = it.rec.y;
      this.tweens.add({ targets: back, v: 1, duration: M.gardenFailReturn, ease: E.gardenFailReturn, onUpdate: () => { it.rec.x = sx + (d.orig.x - sx) * back.v; it.rec.y = sy + (d.orig.y - sy) * back.v; it.bob.y = -8 * (1 - back.v); it.applyView(); }, onComplete: done });
    } else {
      const c0 = { x: it.screen.x, y: it.screen.y };
      this.tweens.add({ targets: it.container, x: d.home.sx, y: d.home.sy, alpha: 0.3, duration: M.gardenFailReturn, ease: E.gardenFailReturn, onComplete: done });
    }
  }

  // ---- 선택 (뒤집기, 보관) ----
  select(item) {
    if (this.selected === item) { this.deselect(); return; }
    this.deselect();
    if (!item) return;
    this.selected = item;
    item.setSelected(true);
    sfx.gardenPick();
    this.selUi.setVisible(true);
    this.placeSelectionUi();
  }
  deselect() {
    if (this.selected) { this.selected.setSelected(false); this.selected = null; }
    if (this.selUi) this.selUi.setVisible(false);
  }
  placeSelectionUi() {
    if (!this.selected || !this.selUi) return;
    const s = this.selected.screen;
    const h = this.selected.spec.w * (this.selected.isBuilding ? 1.05 : 0.9) * this.view.zoom;
    const x = Phaser.Math.Clamp(s.x - 12, 150, 390);
    this.selUi.setPosition(x, Math.max(190, s.y - h - 8));
  }
  flipSelected() {
    if (!this.selected) return;
    this.selected.rec.flip = !this.selected.rec.flip;
    this.selected.applyView();
    sfx.click();
    save.saveGarden();
  }
  storeSelected() { if (this.selected) this.storeItem(this.selected); }
  storeItem(it) {
    if (it.constructing) return;
    const g = this.g;
    g.placed = g.placed.filter((r) => r !== it.rec);
    g.tray[it.rec.id] = Math.min(CONFIG.gardenItemMaxStackCount, (g.tray[it.rec.id] || 0) + 1);
    this.items = this.items.filter((x) => x !== it);
    if (this.selected === it) { this.selected = null; this.selUi.setVisible(false); }
    sfx.gardenPlace();
    it.destroy();
    save.saveGarden();
    this.buildTray();
  }

  // ---- 확대 (1.0 <-> 0.6, 250ms) ----
  toggleZoom() { this.setZoom(this.view.zoom > 0.8 ? CONFIG.gardenZoomFarRatio : CONFIG.gardenZoomNearRatio); }
  setZoom(z) {
    if (Math.abs(this.view.zoom - z) < 0.01 || this.zoomTween) return;
    sfx.click();
    const from = this.view.zoom;
    const k = { v: from };
    this.zoomTween = this.tweens.add({ targets: k, v: z, duration: M.gardenZoom, ease: E.gardenZoom, onUpdate: () => { this.view.zoom = k.v; this.view.clampPan(); this.applyAllViews(); }, onComplete: () => { this.view.zoom = z; this.zoomTween = null; this.view.clampPan(); this.applyAllViews(); } });
  }
  saveCam() { this.g.cam = { x: this.view.pan.x, y: this.view.pan.y }; save.saveGarden(); }

  // ---- 영지가 늘어난 직후 (F41): 새 영지가 솟아오르며 반짝인다 ----
  plotGrowFx() {
    sfx.plotExpand();
    this.plot.setAlpha(0.2).setScale(this.plot.scaleX * 0.96);
    const sc = this.view.zoom * this.plotBase;
    this.tweens.add({ targets: this.plot, alpha: 1, scaleX: sc, scaleY: sc, duration: M.plotExpand, ease: E.plotExpand });
    toast(this, t('garden.plotGrew'), { kind: 'normal', y: 220 });
    this.fx.spark.explode(14, 270, 480);
  }

  // ---- 타이머: 시계 1000ms 검사, 동시 애니메이션 상한 200ms 검사 ----
  startTimers() {
    this.clockTimer = this.time.addEvent({ delay: CONFIG.gardenClockPollMs, loop: true, callback: () => this.syncClock(M.skyFade) });
    this.budgetTimer = this.time.addEvent({ delay: CONFIG.perf.visibilityCheckMs, loop: true, callback: () => this.updateBudget() });
    this.updateBudget();
    this.events.on('lowperf', () => { this.residents.assignMovers(); });
    this.game.events.on('lowperf', () => { if (this.residents) this.residents.assignMovers(); });
    this.events.once('shutdown', () => { this.clockTimer.remove(); this.budgetTimer.remove(); });
  }
  // 카메라 + 80px 밖은 일시정지, 상한(모바일 건물 6, 장식 8)을 넘으면 중심에서 먼 것부터 중립 자세로 멈춘다 (R46)
  updateBudget() {
    const lim = limits();
    const m = CONFIG.perf.offscreenMarginPx;
    const vis = (it) => it.screen && it.screen.x > -m && it.screen.x < 540 + m && it.screen.y > -m && it.screen.y < 960 + m;
    const rank = (arr) => arr.filter(vis).sort((a, b) => Math.hypot(a.screen.x - 270, a.screen.y - 480) - Math.hypot(b.screen.x - 270, b.screen.y - 480));
    const blds = this.items.filter((i) => i.isBuilding && i.idleStarted);
    const decor = this.items.filter((i) => !i.isBuilding && i.tweens.length);
    const allowB = new Set(rank(blds).slice(0, lim.buildingAnim));
    const allowD = new Set(rank(decor).slice(0, lim.decorAnim));
    for (const it of blds) { const on = allowB.has(it); it.budgetPaused = !on; it.setAnimActive(on); }
    for (const it of decor) { const on = allowD.has(it); it.budgetPaused = !on; it.setAnimActive(on); }
  }

  // ---- 첫 방문 안내 3단계 (R22) ----
  maybeCoach() {
    if (!save.hasSeen('coach1')) this.showCoach('coach1', 'garden.coachPan', 270, 672, { tail: 'up', w: 280, h: 62, icon: true });
    else if (!save.hasSeen('coach2')) { this.showCoach('coach2', 'garden.coachEdit', 150, 800, { tail: 'down', w: 300, h: 76, tailAt: -100 }); this.editBtn.setPulse(true); this.editPulse = true; }
  }
  showCoach(key, textKey, x, y, o = {}) {
    if (this.coach) this.coach.destroy();
    this.coachKey = key;
    const b = bubble(this, x, y, o.w || 280, o.h || 60, t(textKey), { tail: o.tail, tailAt: o.tailAt || 0, size: 20 }).setDepth(UI + 10);
    b.fadeIn();
    this.coach = b;
    if (key === 'coach1') this.time.delayedCall(9000, () => { if (this.coach === b && this.coachKey === 'coach1') { b.fadeOut(); this.coach = null; save.markSeen('coach1'); this.maybeCoach(); } });
  }
}
