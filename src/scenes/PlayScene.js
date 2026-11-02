// S3 play: 6x6 판에서 스와이프/화살표/키보드로 이슬방울을 밀어 모든 꽃봉오리를 피운다 (R1~R6, R17, R18, R22~R26, R43, F1~F45).
// 판정은 puzzle.js(순수 로직)가 먼저 계산하고, 이 씬은 그 결과를 따라 연출한다. 힌트는 저장된 해법과 이동 기록을 비교한다(런타임 풀이기 없음).
import { THEME } from '../theme.js';
import { CONFIG, TEST_STAGE, TEST_DURATION, TEST } from '../config.js';
import { t } from '../i18n/index.js';
import { slide, initialState, remainingBuds, K, NB } from '../puzzle.js';
import { stageById, levelOf, branchOf, localOf, idOf, labelOf, NEW_ELEMENT_BY_ID, HIDDEN, letterToDir, DIR_LETTERS } from '../stages.js';
import { computeHint } from '../hint.js';
import { Backdrop } from '../ui/bg.js';
import { DewRig } from '../ui/dew.js';
import { Board } from '../play/board.js';
import { buildHud, buildControls } from '../play/hud.js';
import { CardManager, DEMO } from '../play/cards.js';
import { button, panel, text, ribbon, toast, bubble, popup, nudge, go, fadeIn, DEPTH, glowSprite, hex, image } from '../ui/kit.js';
import * as save from '../save.js';
import * as wallet from '../wallet.js';
import { branchStars, passLevel, isStageUnlocked, isBranchUnlocked, nextStageId } from '../progress.js';
import { sfx, startMusic } from '../audio.js';
import { appliedSkin, appliedTheme } from '../save.js';

const M = THEME.motionMs;
const E = THEME.easing;
const DIRS = ['up', 'right', 'down', 'left'];
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const ELEMENT_ORDER = ['ice', 'dirt', 'arrow', 'petal', 'mushroom', 'tree', 'pot', 'frog', 'acorn'];
// 숨은 상호작용 카드에 쓸 둘째 요소 그림
const ELEMENT_IMAGE = { arrow: 'arrow_leaf', petal: 'petal_portal', mushroom: 'mushroom', ice: 'ice', dirt: 'dirt', pot: 'pot', acorn: 'acorn' };
// 이번 앱 실행에서 이미 들어온 스테이지: 도입 스테이지를 다시 들어오면 발견 모드가 아니라 시작 모드 카드를 쓴다 (R43)
const visited = new Set();

export default class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }

  init(data) {
    this.stageId = Math.max(1, Math.min(CONFIG.stageCount, (data && data.stage) || TEST_STAGE || 1));
  }

  create() {
    fadeIn(this);
    const id = this.stageId;
    this.id = id;
    this.def = stageById(id);
    this.level = levelOf(id);
    this.branch = branchOf(id);
    this.local = localOf(id);
    this.goal = this.def.goal;
    save.setLastBranch(this.branch);
    this.testHooks = {};
    this.state = initialState(this.level);
    this.snaps = [this.state];
    this.history = [];
    this.moves = 0;
    this.score = 0;
    this.hintsUsed = 0;
    this.busy = false;
    this.cleared = false;
    this.paused = false;
    this.lockUntil = 0;
    this.hintOverlay = null;
    this.rewinding = false;
    this.seenThisEntry = new Set();
    this.discovery = !visited.has(id);
    visited.add(id);
    this.undoLeft = save.getUndoLeft(id);
    this.lastBlockedToast = 0;
    // 같은 씬 인스턴스가 다시 시작되므로 이전 판의 상태를 모두 비운다
    this.leaving = false;
    this.swipeGuide = null; this.guideObjs = null; this.guideDpad = null; this.pausePop = null; this.starTipObj = null;
    this.undoPulseOn = false; this.hintPulseOn = false; this.curStars = undefined;

    new Backdrop(this, { zone: this.branch, clouds: this.branch === 5 ? [[330, 20, 90]] : [], motes: true });
    const th = THEME.themes[appliedTheme()];
    this.board = new Board(this, this.level, this.state, { zone: this.branch, tint: th && th.grassTint && th.grassTint !== 'zones' ? th.grassTint : undefined });
    this.board.onChain = (x, y, n) => this.showChain(x, y, n);
    const anchor = this.board.anchor(this.level.start);
    this.dew = new DewRig(this, { x: anchor.x, y: anchor.y, box: THEME.dew.imageBoxPx.play, skin: appliedSkin(), depth: DEPTH.objects + 8 });
    this.dew.setExpr('idle').startBreath().startBlink();

    this.hud = buildHud(this, { branch: this.branch, local: this.local, onPause: () => this.openPause(), onStarTap: () => this.starTip() });
    this.controls = buildControls(this, {
      undoLeft: this.undoLeft, onMove: (d) => this.tryMove(d), onUndo: () => this.undo(), onUndoEmpty: () => this.undoEmptyFeedback(), onRestart: () => this.restart(), onHint: () => this.hint()
    });
    this.refreshHud();
    this.cards = new CardManager(this);

    this.setupInput();
    this.startTutorials();
    startMusic(this);
    if (TEST_DURATION) this.time.delayedCall(TEST_DURATION * 1000, () => this.forceFinish());
    this.events.on('resume', () => this.cards && this.cards.setPaused(false));
    this.onHidden = () => { if (document.hidden && !this.cleared && !this.paused) this.openPause(); };
    document.addEventListener('visibilitychange', this.onHidden);
    this.events.once('shutdown', () => { document.removeEventListener('visibilitychange', this.onHidden); this.board.destroy(); this.dew.destroy(); });
  }

  // ---- 자동 점검 규약 (?test=1) ----
  get testScore() { return this.moves; }
  debugTargets() {
    if (this.cleared || this.busy || this.paused) return [];
    const h = computeHint(this.def.solutions, this.history);
    if (!h) return [];
    const b = this.controls.dpad[letterToDir(h.next)];
    return b ? [{ x: b.x, y: b.y }] : [];
  }
  getStats() {
    return { stage: labelOf(this.id), moves: this.moves, goal: this.goal, flowersLeft: remainingBuds(this.level, this.state), undoLeft: save.getUndoLeft(this.id), hints: wallet.getHintCount(), hintsUsed: this.hintsUsed, cleared: this.cleared };
  }

  // ---- 입력 ----
  setupInput() {
    this.swipe = null;
    this.input.on('pointerdown', (p, over) => { if (over && over.length) return; this.swipe = { x: p.x, y: p.y }; });
    this.input.on('pointermove', (p) => {
      if (!this.swipe || !p.isDown) return;
      const dx = p.x - this.swipe.x; const dy = p.y - this.swipe.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= CONFIG.swipeThresholdPx) {
        const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
        this.swipe = null;
        this.tryMove(d);
      }
    });
    this.input.on('pointerup', () => { this.swipe = null; });
    const k = this.input.keyboard;
    const bind = (names, fn) => names.forEach((n) => k.on(`keydown-${n}`, fn));
    bind(['UP', 'W'], () => this.tryMove(0));
    bind(['RIGHT', 'D'], () => this.tryMove(1));
    bind(['DOWN', 'S'], () => this.tryMove(2));
    bind(['LEFT', 'A'], () => this.tryMove(3));
    bind(['Z'], () => this.undo());
    bind(['R'], () => this.restart());
    bind(['H'], () => this.hint());
    bind(['ESC', 'P'], () => (this.paused ? this.closePause() : this.openPause()));
  }

  canAct() { return !this.busy && !this.cleared && !this.paused && !this.rewinding && this.time.now >= this.lockUntil; }

  tryMove(d) {
    if (!this.canAct()) return;
    this.cancelHint();
    this.dismissGuides();
    const res = slide(this.level, this.state, d, { events: true });
    if (!res || !res.state) { this.blockedFeedback(d); return; }
    const prev = this.state;
    this.busy = true;
    this.cards.onMove();
    this.history.push(DIR_LETTERS[d]);
    this.snaps.push(res.state);
    this.state = res.state;
    this.moves += 1;
    this.score = this.moves;
    this.refreshHud(true);
    this.board.play(res, prev, this.dew, () => this.afterMove(res));
  }

  blockedFeedback(d) {
    // F4: 떨림 6px, 걱정 표정 400ms (방향 교체 없이 정면에서)
    this.dew.setDir('down');
    this.dew.setExpr('worry');
    this.dew.shake(6, M.dewBlocked);
    sfx.blocked();
    this.time.delayedCall(M.dewBlocked, () => { if (!this.busy) this.dew.setExpr('idle'); });
    this.lockUntil = this.time.now + CONFIG.inputLockAfterMoveMs;
    if (this.time.now - this.lastBlockedToast > 1200) { this.lastBlockedToast = this.time.now; toast(this, t('play.blocked'), { kind: 'info', y: 183, ms: 700 }); }
  }

  afterMove(res) {
    this.busy = false;
    this.lockUntil = this.time.now + CONFIG.inputLockAfterMoveMs;
    if (this.dew.expr !== 'smile') this.dew.setExpr('smile');
    this.time.delayedCall(700, () => { if (!this.busy && !this.cleared && this.dew.expr === 'smile') this.dew.setExpr('idle'); });
    // F45 숨은 상호작용 첫 발생: 칸 표시 600ms, 그 뒤 카드 (발견 모드)
    const firsts = (res.hidden || []).filter((h) => !save.hasSeen(`mark:${h.id}`));
    for (const h of firsts) this.interactionMark(h, res);
    if (res.cleared) this.onClear();
  }

  // ---- 표시 ----
  refreshHud(animate) {
    const rem = remainingBuds(this.level, this.state);
    this.hud.setMoves(this.moves, this.goal);
    this.hud.setFlowers(rem);
    const stars = save.starsFor(Math.max(this.moves, 0), this.goal);
    const wasStars = this.curStars === undefined ? 3 : this.curStars;
    this.curStars = this.moves === 0 ? 3 : stars;
    this.hud.setStars(this.curStars);
    if (animate && wasStars === 3 && this.curStars < 3) { // F9 별 3개 불가
      sfx.starLost();
      const s = this.hud.stars[2];
      this.tweens.add({ targets: s, alpha: { from: 1, to: 0.5 }, duration: M.starLostFade, ease: E.starLostFade, yoyo: false });
      toast(this, t('play.starLost'), { kind: 'warn', y: 183 });
    } else this.hud.stars.forEach((s) => s.setAlpha(1));
  }

  showChain(x, y, n) {
    sfx.chain();
    this.cameras.main.shake(M.shake, 0.0075);
    const pop = text(this, x, y, t('play.chainX', { n }), { size: 48, color: '#FFFFFF', stroke: '#D9547E', strokeW: 8, shadowY: 4, shadowColor: '#D9547E' }).setDepth(DEPTH.popup).setAngle(-6).setScale(0.4);
    this.tweens.add({ targets: pop, scale: 1, duration: M.chainPop, ease: E.chainPop });
    this.tweens.add({ targets: pop, y: y - 30, alpha: 0, delay: 600, duration: 400, onComplete: () => pop.destroy() });
    const r = ribbon(this, 270, 180, t('play.chain', { n }), { kind: 'pink', size: 26, h: 54 }).setDepth(DEPTH.popup).setAlpha(0).setY(154);
    this.tweens.add({ targets: r, alpha: 1, y: 180, duration: 250, ease: 'Back.easeOut' });
    this.tweens.add({ targets: r, alpha: 0, delay: 1100, duration: 250, onComplete: () => r.destroy() });
  }

  // ---- 클리어 ----
  onClear() {
    this.cleared = true;
    this.cards.closeAll();
    this.cancelHint();
    this.dew.setDir('down');
    this.dew.setExpr('clear');
    this.dew.hop(CONFIG.dewClearHopHeightPx, CONFIG.dewClearMs / CONFIG.dewClearHopCount, CONFIG.dewClearHopCount);
    sfx.clear();
    this.board.clearFx();
    this.time.delayedCall(M.clearToResult, () => this.finish(false));
  }

  forceFinish() {
    if (this.leaving) return;
    this.cleared = true;
    this.finish(true);
  }

  finish(forced) {
    if (this.leaving) return;
    this.leaving = true;
    const id = this.id;
    const b = this.branch;
    const moves = Math.max(1, this.moves);
    const stars = save.starsFor(moves, this.goal);
    const before = { branchStars: branchStars(b), passLevel: passLevel(b), nextStage: nextStageId(id) !== null, nextBranch: b < CONFIG.branchCount ? isBranchUnlocked(b + 1) : true };
    let rec; let coins;
    if (forced && TEST) {
      // 테스트 모드의 강제 종료(?duration)는 기록을 남기지 않는다
      rec = { stars, prev: save.getRecord(id), first: false, newBest: false, best: moves, perfect: stars === 3 };
      coins = { earned: 0 };
    } else {
      const prevStars = save.getRecord(id).stars;
      rec = save.recordClear(id, moves, this.goal);
      coins = wallet.awardClear(prevStars, rec.stars);
    }
    const after = { branchStars: branchStars(b), passLevel: passLevel(b), nextStage: nextStageId(id) !== null, nextBranch: b < CONFIG.branchCount ? isBranchUnlocked(b + 1) : true };
    save.flushNow();
    go(this, 'Result', { stage: id, moves, stars, rec, coins, hintsUsed: this.hintsUsed, before, after, forced: !!forced });
  }

  // ---- 되돌리기 (R5, F13, F14) ----
  undo() {
    if (!this.canAct() || this.history.length === 0) return;
    if (save.getUndoLeft(this.id) <= 0) { this.undoEmptyFeedback(); return; }
    this.cancelHint();
    if (!save.useUndo(this.id)) return;
    this.history.pop();
    this.snaps.pop();
    this.state = this.snaps[this.snaps.length - 1];
    this.moves = this.history.length;
    this.score = this.moves;
    this.busy = true;
    sfx.undo();
    this.controls.setUndo(save.getUndoLeft(this.id));
    this.refreshHud();
    this.board.syncTo(this.state, this.dew, M.undo, () => { this.busy = false; this.dew.setExpr('idle'); });
  }
  undoEmptyFeedback() {
    nudge(this, this.controls.undo);
    sfx.blocked();
    toast(this, t('play.undoEmpty'), { kind: 'warn', y: 690, ms: 1500, size: 19 });
  }

  // ---- 다시 시작: 판과 이동 횟수만 처음으로 (되돌리기 횟수는 다시 채우지 않는다) ----
  restart() {
    if (this.cleared || this.paused || this.rewinding || this.busy) return;
    if (this.history.length === 0) return;
    this.cancelHint();
    this.history = [];
    this.state = this.snaps[0];
    this.snaps = [this.snaps[0]];
    this.moves = 0;
    this.score = 0;
    this.busy = true;
    sfx.undo();
    this.refreshHud();
    this.board.syncTo(this.state, this.dew, 220, () => { this.busy = false; this.dew.setExpr('idle'); });
  }

  // ---- 힌트 (R18, F21, F22, F26, F27) ----
  hint() {
    if (!this.canAct()) return;
    if (wallet.getHintCount() <= 0) { nudge(this, this.controls.hint); sfx.hintFail(); toast(this, t('play.hintNone'), { kind: 'warn', y: 183 }); return; }
    const h = computeHint(this.def.solutions, this.history);
    if (!h) { sfx.hintFail(); toast(this, t('play.hintStuck'), { kind: 'warn', y: 183 }); return; }
    this.cancelHint();
    this.dismissGuides();
    if (!wallet.useHint()) return;
    this.hintsUsed += 1;
    sfx.hintUse();
    if (h.rewind > 0) this.rewindThenShow(h);
    else this.showHintOverlay(h.next);
  }

  rewindThenShow(h) {
    this.rewinding = true;
    this.busy = true;
    const keep = h.keep;
    const n = h.rewind;
    const wrong = this.snaps[keep + 1];
    const per = Math.min(CONFIG.hintRewindStepMs, CONFIG.hintRewindMaxTotalMs / n);
    toast(this, keep === 0 ? t('play.hintRewoundStart') : t('play.hintRewound', { n }), { kind: 'info', y: 183, ms: CONFIG.hintRewoundNoticeSec * 1000 });
    sfx.hintRewind();
    // 틀린 수의 도착 자리에 옅은 잔상 (F27)
    const a = this.board.anchor(wrong.dew);
    const ghost = this.add.image(a.x, a.y, 'dew_body').setOrigin(0.5, 0.89).setDisplaySize(THEME.dew.imageBoxPx.play, THEME.dew.imageBoxPx.play).setAlpha(0.35).setTint(0xdddddd).setDepth(DEPTH.objects + 7);
    this.tweens.add({ targets: ghost, alpha: 0, delay: per * n, duration: M.hintGhost, ease: E.hintGhost, onComplete: () => ghost.destroy() });
    const step = (i) => {
      // i: 지금 되돌아갈 스냅샷 번호(현재 길이 - 1 부터 keep 까지)
      this.history.pop(); this.snaps.pop();
      this.state = this.snaps[this.snaps.length - 1];
      this.moves = this.history.length; this.score = this.moves;
      this.refreshHud();
      this.board.syncTo(this.state, this.dew, per, () => {
        if (this.history.length > keep) step(i - 1);
        else { this.rewinding = false; this.busy = false; this.dew.setExpr('idle'); this.showHintOverlay(h.next); }
      });
    };
    step(n);
  }

  // 점선 경로 + 도착 링 + 화살촉, 해당 방향 버튼 펄스, 4초 (F21)
  showHintOverlay(letter) {
    const d = letterToDir(letter);
    const res = slide(this.level, this.state, d, { events: true });
    if (!res || !res.state) return;
    const pts = [];
    const pushC = (cell) => { const c = this.board.center(cell); pts.push([c.x, c.y]); };
    for (const e of res.events) {
      if (e.e === 'start') pushC(e.cell);
      else if (e.e === 'step') pushC(e.cell);
      else if (e.e === 'teleport') { pushC(e.to); }
    }
    const g = this.add.graphics().setDepth(DEPTH.objects + 12);
    const ring = this.add.graphics().setDepth(DEPTH.objects + 12);
    const end = pts[pts.length - 1];
    const prev = pts[Math.max(0, pts.length - 2)];
    const ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
    const phase = { v: 0 };
    const draw = () => {
      g.clear();
      const dots = [];
      for (let i = 0; i + 1 < pts.length; i++) {
        const [x0, y0] = pts[i]; const [x1, y1] = pts[i + 1];
        const len = Math.hypot(x1 - x0, y1 - y0);
        if (len > 130 && (Math.abs(x1 - x0) > 85 && Math.abs(y1 - y0) > 85)) continue;
        for (let s = (phase.v % 16); s < len; s += 16) dots.push([x0 + ((x1 - x0) * s) / len, y0 + ((y1 - y0) * s) / len]);
      }
      g.fillStyle(0x2B4A3B, 0.35);
      dots.forEach(([x, y]) => g.fillCircle(x, y, 7));
      g.fillStyle(0xFFFFFF, 1);
      dots.forEach(([x, y]) => g.fillCircle(x, y, 4.5));
      // 화살촉 20x30, 3px 잉크 윤곽
      const c = Math.cos(ang); const s = Math.sin(ang);
      const P = (x, y) => [end[0] + x * c - y * s, end[1] + x * s + y * c];
      const tri = [P(-4, -15), P(16, 0), P(-4, 15)];
      g.lineStyle(3, 0x2B4A3B, 1).fillStyle(0xFFFFFF, 1);
      g.beginPath(); g.moveTo(...tri[0]); g.lineTo(...tri[1]); g.lineTo(...tri[2]); g.closePath(); g.fillPath(); g.strokePath();
    };
    ring.lineStyle(6, 0xFFC800, 1).strokeCircle(0, 0, 38);
    ring.lineStyle(2.5, 0xFFFFFF, 1).strokeCircle(0, 0, 31);
    ring.setPosition(end[0], end[1]).setAlpha(0);
    const marchTween = this.tweens.add({ targets: phase, v: 16, duration: M.hintDash, repeat: -1, ease: 'Linear', onUpdate: draw });
    const ringTween = this.tweens.add({ targets: ring, scale: { from: 0.92, to: 1.08 }, duration: M.hintRing, yoyo: true, repeat: -1, ease: E.hintRing });
    this.tweens.add({ targets: ring, alpha: 1, delay: M.hintDraw, duration: 150 });
    draw();
    const btn = this.controls.dpad[d];
    btn.setPulse(true);
    // 이슬이 그 방향을 본다
    if (d === 1 || d === 3) this.dew.setDir(DIRS[d]); else { this.dew.setDir('down'); this.dew.setGaze(0, d === 0 ? -3 : 3); }
    this.dew.setExpr('smile');
    const stop = () => {
      marchTween.remove(); ringTween.remove(); btn.setPulse(false);
      this.tweens.add({ targets: [g, ring], alpha: 0, duration: M.guideFadeOut, ease: E.guideFadeOut, onComplete: () => { g.destroy(); ring.destroy(); } });
      this.dew.setDir('down'); this.dew.setGaze(0, 0); if (!this.busy) this.dew.setExpr('idle');
    };
    const timer = this.time.delayedCall(M.hintDisplay, () => { this.hintOverlay = null; stop(); });
    this.hintOverlay = { stop: () => { timer.remove(); this.hintOverlay = null; stop(); } };
  }
  cancelHint() { if (this.hintOverlay) this.hintOverlay.stop(); }

  // ---- 일시정지 ----
  openPause() {
    if (this.paused || this.cleared || this.leaving) return;
    this.paused = true;
    this.cards.setPaused(true);
    sfx.open();
    const pop = popup(this, 360, 375, { y: 477 });
    this.pausePop = pop;
    const D = DEPTH.popup;
    pop.add(text(this, 270, 345, t('play.pause'), { size: 40, color: THEME.palette.text }));
    pop.add(button(this, { x: 270, y: 430, w: 300, h: 80, variant: 'primary', size: 28, label: t('pause.resume'), glyph: 'ui-extra-icon-play-dark', iconSize: 28, onClick: () => this.closePause(), depth: D + 2 }));
    pop.add(button(this, { x: 270, y: 520, w: 300, h: 68, variant: 'secondary', size: 20, label: t('pause.stages'), onClick: () => go(this, 'StageSelect', { branch: this.branch }), depth: D + 2 }));
    pop.add(button(this, { x: 270, y: 602, w: 300, h: 68, variant: 'neutral', size: 20, label: t('pause.menu'), onClick: () => go(this, 'Menu'), depth: D + 2 }));
  }
  closePause() {
    if (!this.paused) return;
    this.paused = false;
    if (this.pausePop) { this.pausePop.close(); this.pausePop = null; }
    this.cards.setPaused(false);
  }

  // ---- 튜토리얼과 안내 (R17, R22, R23, F18, F25, F43, F45) ----
  dismissGuides() {
    if (this.swipeGuide) { this.swipeGuide.destroy(); this.swipeGuide = null; }
    if (this.guideObjs) { this.guideObjs.forEach((o) => { try { o.destroy(); } catch (e) { /* 무시 */ } }); this.guideObjs = null; }
    if (this.undoPulseOn) { this.controls.undo.setPulse(false); this.undoPulseOn = false; }
    if (this.hintPulseOn) { this.controls.hint.setPulse(false); this.hintPulseOn = false; }
    if (this.guideDpad) { this.guideDpad.setPulse(false); this.guideDpad = null; }
  }

  startTutorials() {
    const id = this.id;
    const track = (o) => { (this.guideObjs = this.guideObjs || []).push(o); return o; };
    const lv = this.level;
    let delay = 500;
    const sequence = [];
    // F43 챕터 첫 진입 배너
    if (this.local === 1 && !save.hasSeenBranch(this.branch)) {
      save.markBranchSeen(this.branch);
      sequence.push(() => {
        const r = ribbon(this, 270, 410, t('play.branchBanner', { b: this.branch, name: t(`branch.name${this.branch}`) }), { kind: 'pink', size: 28, maxW: 450, h: 66 }).setDepth(DEPTH.popup).setAlpha(0).setY(380);
        sfx.branchBanner();
        this.tweens.add({ targets: r, alpha: 1, y: 410, duration: 300, ease: E.branchBanner });
        this.tweens.add({ targets: r, alpha: 0, delay: M.branchBanner, duration: 250, onComplete: () => r.destroy() });
        return M.branchBanner + 300;
      });
    }
    // F18 새 요소: 칸 글로우와 배너 2초
    const newEl = NEW_ELEMENT_BY_ID[id];
    if (newEl) {
      sequence.push(() => {
        const r = ribbon(this, 270, 182, t('play.newElement'), { kind: 'sky', size: 24, h: 52 }).setDepth(DEPTH.popup).setAlpha(0).setY(150);
        sfx.banner();
        this.tweens.add({ targets: r, alpha: 1, y: 182, duration: 300, ease: E.banner });
        this.tweens.add({ targets: r, alpha: 0, delay: M.banner, duration: 250, onComplete: () => r.destroy() });
        this.highlightElement(newEl);
        return M.banner + 300;
      });
    }
    // 요소 설명 카드 9종(R22): 그 요소가 있는 스테이지를 처음 할 때 1회. 시작당 최대 2장, 요소 카드가 먼저
    const present = { ice: lv.ices.length > 0, dirt: lv.dirts.length > 0, arrow: lv.kind.some((k) => k === K.ARROW), petal: lv.petalCells.length > 0, mushroom: lv.kind.some((k) => k === K.MUSH), tree: lv.kind.some((k) => k === K.TREE), pot: lv.pots.length > 0, frog: lv.frogs.length > 0, acorn: lv.acorns.length > 0 };
    const cards = [];
    for (const el of ELEMENT_ORDER) if (present[el] && !save.hasSeen(`card:${el}`)) cards.push({ id: `card:${el}`, textKey: `tutorial.${el}`, demo: DEMO[el], closeOnMove: true });
    // 숨은 상호작용 카드(R43, 시작 모드): 도입 스테이지 이상이고 그 두 요소가 있는 스테이지
    for (const h of HIDDEN) {
      if (id < h.introId || save.hasSeen(`card:${h.id}`)) continue;
      const needs = h.b ? present[h.a] && present[h.b] : present[h.a];
      if (!needs) continue;
      if (this.discovery && id === h.introId) continue; // 발견 모드: 시작 때는 띄우지 않는다
      cards.push({ id: `card:${h.id}`, textKey: h.key, demo: this.hiddenDemo(h), closeOnMove: true });
    }
    const startCards = cards.slice(0, CONFIG.cardsPerStageStartMaxCount);
    // 안내 말풍선들 (R17, R22 기본 안내)
    if (id === 1 && !save.hasSeen('swipe')) this.guideSwipe(track);
    if (id === 2 && !save.hasSeen('starGoal')) { save.markSeen('starGoal'); this.time.delayedCall(700, () => this.starTip(3500)); }
    if (id === 3 && !save.hasSeen('undo')) {
      save.markSeen('undo');
      this.undoPulseOn = true; this.controls.undo.setPulse(true);
      const b = track(bubble(this, 150, 640, 250, 60, t('play.undoTip'), { tail: 'down', tailAt: -60, size: 19 }).setDepth(DEPTH.popup - 3));
      b.fadeIn();
      this.time.delayedCall(6000, () => { if (b.active) b.fadeOut(); if (this.undoPulseOn) { this.controls.undo.setPulse(false); this.undoPulseOn = false; } });
    }
    if (id === 4 && !save.hasSeen('hintTip')) {
      save.markSeen('hintTip');
      this.hintPulseOn = true; this.controls.hint.setPulse(true);
      const b = track(bubble(this, 294, 676, 176, 80, t('play.hintTip'), { tail: 'down', tailAt: 100, size: 20 }).setDepth(DEPTH.popup - 3));
      b.fadeIn();
      this.time.delayedCall(6000, () => { if (b.active) b.fadeOut(); if (this.hintPulseOn) { this.controls.hint.setPulse(false); this.hintPulseOn = false; } });
    }
    // 되돌리기 남은 횟수 안내 (R5, F14): 시작 때 2 미만이면 1.5초
    if (this.undoLeft < CONFIG.undoPerStageCount) this.time.delayedCall(900, () => toast(this, t('play.undoCarry', { n: this.undoLeft }), { kind: 'info', y: 700, ms: CONFIG.undoCarryNoticeSec * 1000, size: 20 }));
    // 순서대로 실행
    let acc = delay;
    for (const run of sequence) { this.time.delayedCall(acc, () => { acc = acc; run(); }); acc += 2400; }
    startCards.forEach((c, i) => {
      this.time.delayedCall(Math.max(acc, 600) + (newEl ? M.cardDelay - 1200 : 0) + i * 100, () => this.cards.enqueue(c));
    });
  }

  hiddenDemo(h) {
    if (h.id === 'H6') return ['dew_body', 'acorn'];
    if (h.id === 'H7') return ['acorn', 'acorn'];
    const first = h.a === 'pot' ? 'pot' : 'acorn';
    return [first, ELEMENT_IMAGE[h.b] || 'rock'];
  }

  // 새 요소 칸에 글로우 2초
  highlightElement(el) {
    const lv = this.level;
    const targets = [];
    const b = this.board;
    if (el === 'ice') targets.push(...b.ices.filter(Boolean));
    else if (el === 'dirt') targets.push(...b.dirts.filter(Boolean));
    else if (el === 'arrow') b.leaves.forEach((x) => x && targets.push(x));
    else if (el === 'petal') targets.push(...b.petals);
    else if (el === 'mushroom') b.mush.forEach((x) => x && targets.push(x));
    else if (el === 'tree') targets.push(...b.trees);
    else if (el === 'pot') targets.push(...b.pots.map((c) => c.img));
    else if (el === 'frog') targets.push(...b.frogs.map((c) => c.img));
    else if (el === 'acorn') targets.push(...b.acorns.map((c) => c.img));
    for (const o of targets) {
      const fx = glowSprite(this, o, 'hint');
      this.tweens.add({ targets: o, alpha: { from: 1, to: 0.7 }, duration: 400, yoyo: true, repeat: 2 });
      this.time.delayedCall(M.banner, () => fx.destroy());
    }
  }

  // 1-1 손가락 안내(R17): 점선 + 손 아이콘이 해법 첫 수 방향으로 900ms 움직인다
  guideSwipe(track) {
    const first = letterToDir(this.def.solutions[0][0]);
    const res = slide(this.level, this.state, first, { events: true });
    if (!res || !res.state) return;
    const c0 = this.board.center(this.level.start);
    const dx = DX[first]; const dy = DY[first];
    const len = 212;
    const g = track(this.add.graphics().setDepth(DEPTH.objects + 12));
    g.lineStyle(10, 0xFFFFFF, 0.95);
    for (let s = 0; s < len; s += 20) g.lineBetween(c0.x + dx * (s + 26), c0.y + dy * (s + 26) + 8, c0.x + dx * (s + 28), c0.y + dy * (s + 28) + 8);
    const hand = track(this.add.image(0, 0, 'icon_hand').setScale(60 / 48 / 2).setDepth(DEPTH.objects + 13).setAngle(-14));
    hand.setPosition(c0.x + dx * 20, c0.y + dy * 20 + 30);
    this.swipeGuide = this.tweens.add({ targets: hand, x: c0.x + dx * (20 + len), y: c0.y + dy * (20 + len) + 30, duration: M.swipeGuide, ease: E.swipeGuide, repeat: -1, repeatDelay: 300, onStop: () => {} });
    const b = track(bubble(this, 270, 590, 300, 56, t('play.tutorialSwipe'), { tail: 'up', tailAt: -60, size: 21 }).setDepth(DEPTH.popup - 3));
    b.fadeIn();
    this.guideDpad = this.controls.dpad[first];
    this.guideDpad.setPulse(true);
    save.markSeen('swipe');
  }

  starTip(ms = 2000) {
    if (this.starTipObj && this.starTipObj.active) return;
    const b = bubble(this, 305, 125, 310, 66, t('play.starGoalTip'), { tail: 'up', tailAt: -60, size: 20 }).setDepth(DEPTH.popup - 3);
    this.starTipObj = b;
    b.fadeIn();
    this.hud.stars.forEach((s) => this.tweens.add({ targets: s, scale: s.scaleX * 1.12, duration: 160, yoyo: true }));
    this.time.delayedCall(ms, () => { if (b.active) b.fadeOut(); });
  }

  // F45: 숨은 상호작용 첫 발생 표시 600ms, 이어서 카드(발견 모드)
  interactionMark(h, res) {
    save.markSeen(`mark:${h.id}`);
    const cell = h.cell;
    const c = this.board.center(cell);
    const ring = this.add.graphics().setDepth(DEPTH.objects + 13);
    ring.fillStyle(0xFFFFFF, 0.18).fillCircle(0, 0, 40);
    ring.lineStyle(4, 0xFFFFFF, 1);
    for (let i = 0; i < 10; i++) { const a0 = (i / 10) * Math.PI * 2; ring.beginPath(); ring.arc(0, 0, 40, a0, a0 + 0.38); ring.strokePath(); }
    ring.setPosition(c.x, c.y);
    const hd = HIDDEN.find((x) => x.id === h.id);
    const disc = this.add.container(c.x + 38, c.y - 38).setDepth(DEPTH.objects + 14);
    const bg = this.add.circle(0, 0, 20, 0xFFFFFF).setStrokeStyle(3, 0x8CCBEA);
    disc.add([bg, image(this, h.id === 'H6' || h.id === 'H7' ? 'acorn' : (hd && hd.a === 'pot' ? 'pot' : 'acorn'), 30)]);
    this.tweens.add({ targets: ring, angle: 30, duration: M.interactMark, ease: 'Linear' });
    sfx.click();
    this.time.delayedCall(M.interactMark, () => { ring.destroy(); disc.destroy(); });
    // 발견 모드 카드: 도입 스테이지 첫 플레이에서 클리어하는 이동이 아닌 경우
    const intro = this.discovery && this.id === hd.introId && !res.cleared && !save.hasSeen(`card:${h.id}`);
    if (intro) this.time.delayedCall(M.interactMark + CONFIG.interactionCardAfterMarkDelayMs, () => { if (!this.cleared) this.cards.enqueue({ id: `card:${h.id}`, textKey: hd.key, demo: this.hiddenDemo(hd), closeOnMove: false }); });
  }
}
