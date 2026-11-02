// S2 stageselect (R12, R32): 챕터 이름과 이전/다음 챕터, 챕터 별/퍼펙트, 진행 막대, 타일 34개(5열, 세로 스크롤), 상점/패스.
// 잠긴 챕터는 해금 조건 안내, 별이 모자라면 별 3개 미만 타일에 옅은 빛(R12), 미클리어 타일에는 남은 되돌리기 배지(R5).
import { THEME } from '../theme.js';
import { CONFIG } from '../config.js';
import { t } from '../i18n/index.js';
import { Backdrop } from '../ui/bg.js';
import { ClipView } from '../ui/clipview.js';
import { button, roundButton, panel, text, image, chip, ribbon, tile, badge, progressBar, popup, toast, go, fadeIn, DEPTH, glow } from '../ui/kit.js';
import { topBar } from '../ui/common.js';
import { idOf, labelOf, NEW_ELEMENT_BY_ID, BRANCH_STAGES } from '../stages.js';
import { isBranchUnlocked, isStageUnlocked, branchStars, perfectCount, claimableCount, branchStarsNeeded } from '../progress.js';
import { getRecord, getUndoLeft, setLastBranch } from '../save.js';
import { sfx } from '../audio.js';

const L = THEME.layout.stageselect;
const M = THEME.motionMs;
const ZONE_ICON = ['flower_3_bloom', 'petal_portal', 'mushroom', 'frog', 'moon'];
const ELEMENT_ICON = { ice: 'ice', dirt: 'dirt', arrow: 'arrow_leaf', petal: 'petal_portal', mushroom: 'mushroom', tree: 'tree', pot: 'pot', frog: 'frog', acorn: 'acorn' };

export default class StageSelectScene extends Phaser.Scene {
  constructor() { super('StageSelect'); }

  init(data) {
    this.branch = Math.max(1, Math.min(CONFIG.branchCount, (data && data.branch) || 1));
  }

  create() {
    fadeIn(this);
    this.testHooks = {};
    const b = this.branch;
    setLastBranch(b);
    this.unlocked = isBranchUnlocked(b);
    new Backdrop(this, { zone: b, clouds: [[180, 30, 100]] });
    const bar = topBar(this, { back: 'Menu' });
    this.testHooks.backButton = bar.back;
    const D = DEPTH.hud;
    // 챕터 머리말 (이전/다음 챕터: 가로 스와이프 60px 도 같다)
    const [px, py, ps] = L.prev;
    this.prevBtn = roundButton(this, { x: px + ps / 2, y: py + ps / 2, size: ps, variant: b > 1 ? 'secondary' : 'neutral', glyph: 'ui-extra-icon-play-dark', glyphRot: 180, disabled: b <= 1, onClick: () => this.gotoBranch(b - 1), depth: D });
    const [nx, ny, ns] = L.next;
    const nextLocked = b < CONFIG.branchCount && !isBranchUnlocked(b + 1);
    this.nextBtn = roundButton(this, { x: nx + ns / 2, y: ny + ns / 2, size: ns, variant: nextLocked || b >= CONFIG.branchCount ? 'neutral' : 'secondary', glyph: 'ui-extra-icon-play-dark', disabled: b >= CONFIG.branchCount, onClick: () => (nextLocked ? this.showLocked(b + 1) : this.gotoBranch(b + 1)), depth: D });
    if (nextLocked) { image(this, 'lock', 26, nx + ns - 6, ny + 6).setDepth(D + 2); this.nextBtn.setDisabled(false); this.nextBtn.bg.setTexture('ui-grey-button-round-depth-flat'); }
    const [hx, hy, hw, hh] = L.name;
    panel(this, hx, hy, hw, hh, { flat: true, depth: D });
    const nameStr = t('branch.name', { b, name: t(`branch.name${b}`) });
    const nameTx = text(this, hx + hw / 2 + 22, hy + hh / 2 - 3, nameStr, { size: 23, color: THEME.palette.ink, maxW: hw - 110 }).setDepth(D + 1);
    image(this, ZONE_ICON[b - 1], 40).setPosition(nameTx.x - nameTx.width / 2 - 28, hy + hh / 2 - 3).setDepth(D + 1);
    // 별/퍼펙트 칩과 진행 막대
    const stars = branchStars(b);
    const c1 = chip(this, 0, L.statsY + 21, t('stage.branchStars', { n: stars }), { kind: 'white', size: 20, icon: 'star_full', iconSize: 28 }).setDepth(D);
    c1.x = 30 + c1.w / 2;
    const c2 = chip(this, 0, L.statsY + 21, t('stage.perfectCount', { n: perfectCount(b) }), { kind: 'gold', size: 20, icon: 'badge_perfect', iconSize: 28 }).setDepth(D);
    c2.x = 280 + c2.w / 2;
    const [bx, by, bw, bh] = L.bar;
    const pb = progressBar(this, bx + bw / 2, by + bh / 2, bw).setDepth(D);
    pb.setValue(stars / CONFIG.branchMaxStarCount);

    this.buildGrid();
    // 잠긴 챕터 안내 / 별 부족 안내
    if (!this.unlocked) {
      text(this, 270, 806, t('stage.branchLocked', { b: b - 1, n: CONFIG.branchUnlockStarCount }), { size: 18, color: THEME.palette.ink, maxW: 480 }).setDepth(D);
      this.time.delayedCall(250, () => this.showLocked(b));
    } else if (this.needStars) {
      const r = ribbon(this, 270, 826, t('stage.needStars', { n: branchStarsNeeded(b + 1) }), { kind: 'gold', size: 22, h: 52, maxW: 440 }).setDepth(D);
      r.setAlpha(0.98);
    } else if (this.hasUndoBadge) {
      text(this, 270, L.helpY, t('stage.undoLeftHelp'), { size: 18, color: THEME.palette.textDim, maxW: 500 }).setDepth(D);
    }
    // 아래 버튼
    const [sx, sy, sw, sh] = L.shop;
    button(this, { x: sx + sw / 2, y: sy + sh / 2, w: sw, h: sh, variant: 'secondary', label: t('stage.shop'), icon: 'coin', iconSize: 36, onClick: () => go(this, 'Shop', { from: 'StageSelect', branch: b }), depth: D });
    const [qx, qy, qw, qh] = L.pass;
    button(this, { x: qx + qw / 2, y: qy + qh / 2, w: qw, h: qh, variant: 'secondary', label: t('stage.pass'), icon: 'reward_closed', iconSize: 42, onClick: () => go(this, 'Pass', { from: 'StageSelect', branch: b }), depth: D });
    const n = claimableCount();
    if (n > 0) badge(this, 511, 857, n, 38).setDepth(D + 2).setPulse(true);
    // 가로 스와이프 60px
    this.input.on('pointerdown', (p, over) => { this.hs = over && over.length ? null : { x: p.x, y: p.y }; });
    this.input.on('pointerup', (p) => {
      if (!this.hs) return;
      const dx = p.x - this.hs.x; const dy = p.y - this.hs.y;
      this.hs = null;
      if (Math.abs(dx) >= CONFIG.branchSwipeThresholdPx && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0 && b < CONFIG.branchCount) (isBranchUnlocked(b + 1) ? this.gotoBranch(b + 1) : this.showLocked(b + 1));
        else if (dx > 0 && b > 1) this.gotoBranch(b - 1);
      }
    });
    this.input.keyboard.on('keydown-ESC', () => bar.back.trigger());
  }

  gotoBranch(b) { if (b < 1 || b > CONFIG.branchCount) return; go(this, 'StageSelect', { branch: b }); }

  showLocked(b) {
    if (this.lockedPop) return;
    sfx.blocked();
    const pop = popup(this, 420, 200, { y: 506 });
    this.lockedPop = pop;
    pop.add(image(this, 'lock', 64).setPosition(270, 470));
    pop.add(text(this, 270, 546, t('stage.branchLocked', { b: b - 1, n: CONFIG.branchUnlockStarCount }), { size: 21, color: THEME.palette.ink, maxW: 380 }));
    pop.dim.once('pointerup', () => { pop.close(); this.lockedPop = null; });
  }

  // 타일 34개: 5열 x 7행, 세로 스크롤
  buildGrid() {
    const b = this.branch;
    const g = L.grid;
    const lastLocal = BRANCH_STAGES;
    const finaleCleared = getRecord(idOf(b, lastLocal)).stars >= 1;
    this.needStars = this.unlocked && b < CONFIG.branchCount && finaleCleared && !isBranchUnlocked(b + 1);
    this.hasUndoBadge = false;
    this.grid = this.add.container(0, 0);
    let firstOpen = 1;
    const seenKey = `openSeen${b}`;
    const prevOpen = this.registry.get(seenKey);
    const nowOpen = [];
    for (let n = 1; n <= BRANCH_STAGES; n++) {
      const id = idOf(b, n);
      const rec = getRecord(id);
      const open = isStageUnlocked(id);
      const cleared = rec.stars >= 1;
      const col = (n - 1) % g.cols;
      const row = Math.floor((n - 1) / g.cols);
      const x = g.x + col * g.colStep + g.tile / 2;
      const y = g.y + row * g.rowStep + g.tile / 2;
      const state = !open ? 'locked' : cleared ? 'cleared' : 'open';
      if (open) nowOpen.push(n);
      const justOpened = open && prevOpen && !prevOpen.includes(n);
      if (open && !cleared && firstOpen === 1) firstOpen = n;
      const tl = tile(this, {
        x, y, state, label: labelOf(id), stars: rec.stars,
        glowKind: rec.stars === 3 ? 'perfectTile' : (this.needStars && cleared && rec.stars < 3 ? 'needTile' : undefined),
        onClick: () => { if (this.view && this.view.dragged) return; if (state === 'locked') this.lockedTile(); else go(this, 'Play', { stage: id }); }
      });
      this.grid.add(tl);
      if (justOpened) this.unlockFx(x, y);
      const el = NEW_ELEMENT_BY_ID[id];
      if (el && open) {
        const disc = this.add.container(x + 36, y - 36);
        disc.add([this.add.circle(0, 0, 17, 0xFFFFFF).setStrokeStyle(3, 0x8CCBEA), image(this, ELEMENT_ICON[el], 28)]);
        this.grid.add(disc);
      }
      if (n === lastLocal) {
        const crown = image(this, 'crown', 44, x, y - 50);
        this.grid.add(crown);
        this.tweens.add({ targets: crown, scale: crown.scaleX * 1.08, duration: M.crownSparkle / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      if (open && !cleared) {
        const left = getUndoLeft(id);
        if (left < CONFIG.undoPerStageCount) {
          this.hasUndoBadge = true;
          const pill = this.add.container(x + 34, y + 34);
          const bg = this.add.graphics();
          bg.fillStyle(0xFFFFFF, 1).fillRoundedRect(-20, -15, 40, 30, 15).lineStyle(2, 0x2B4A3B, 0.3).strokeRoundedRect(-20, -15, 40, 30, 15);
          const ic = this.add.image(-7, 0, left ? 'icon_undo' : 'icon_undo_danger').setScale(22 / 48 / 2);
          const num = text(this, 10, -1, t('stage.undoLeft', { n: left }), { size: 18, color: left ? THEME.palette.ink : THEME.palette.danger });
          pill.add([bg, ic, num]);
          this.grid.add(pill);
        }
      }
    }
    this.registry.set(seenKey, nowOpen);
    // 스크롤 영역: 목록이 화면보다 길면 세로로 끌어서 본다 (보조 카메라로 영역 밖을 자른다)
    const [cx, cy, cw, ch] = g.clip;
    const rows = Math.ceil(BRANCH_STAGES / g.cols);
    this.view = new ClipView(this, { x: cx, y: cy, w: cw, h: ch, axis: 'y' });
    this.view.add(this.grid);
    this.view.setContentSize(g.y - cy + rows * g.rowStep + 40);
    const firstRow = Math.floor((firstOpen - 1) / g.cols);
    this.view.setScroll(Math.max(0, (firstRow - 1) * g.rowStep));
    this.view.enableDrag(g.rowStep);
  }

  // F15: 자물쇠가 +-8도로 떨리다 사라지고 반짝임 4개 (350ms)
  unlockFx(x, y) {
    const lock = image(this, 'lock', 40, x, y);
    this.grid.add(lock);
    sfx.unlock();
    this.tweens.add({ targets: lock, angle: { from: -8, to: 8 }, duration: 50, yoyo: true, repeat: 1, onComplete: () => this.tweens.add({ targets: lock, scale: 0, alpha: 0, duration: 150, ease: THEME.easing.unlockLock, onComplete: () => lock.destroy() }) });
    const sp = this.add.particles(x, y, 'p_spark', { emitting: false, lifespan: 150 + 200, speed: { min: 40, max: 90 }, scale: { start: 0.8, end: 0 }, alpha: { start: 1, end: 0 }, blendMode: 'ADD' });
    this.grid.add(sp);
    sp.explode(4);
  }

  lockedTile() { sfx.blocked(); toast(this, t('stage.locked'), { kind: 'info', y: 806, size: 22 }); }
}
