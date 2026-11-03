// S9 pass (R35, F16, F34, F35): 챕터 탭 5개, 진행 막대, 15단계 보상 줄, 받기/모두 받기, 정원으로. 별 6개마다 1단계, 보상은 탭해서 받는다(서버·결제·기간 없음).
import { THEME } from '../theme.js';
import { CONFIG } from '../config.js';
import { t } from '../i18n/index.js';
import { Backdrop } from '../ui/bg.js';
import { ClipView } from '../ui/clipview.js';
import { button, panel, text, image, chip, ribbon, toast, progressBar, go, fadeIn, DEPTH, nudge, glow } from '../ui/kit.js';
import { topBar } from '../ui/common.js';
import { passReward, FRIENDS, ITEMS, itemTexture } from '../catalog.js';
import { ensureImages, sceneAlive, itemImages } from '../assets.js';
import { bakeGardenTexture } from '../art.js';
import * as save from '../save.js';
import * as wallet from '../wallet.js';
import { branchStars, passLevel, isBranchUnlocked, claimableLevels, passStarsFor, passStarsToNext, recentBranch } from '../progress.js';
import { sfx } from '../audio.js';

const L = THEME.layout.pass;
const M = THEME.motionMs;
const P = THEME.palette;

export default class PassScene extends Phaser.Scene {
  constructor() { super('Pass'); }

  init(data) {
    this.from = (data && data.from) || 'Menu';
    this.fromBranch = (data && data.branch) || undefined;
    let b = (data && data.branch) || undefined;
    if (!b) { b = 1; for (let k = 1; k <= CONFIG.branchCount; k++) if (claimableLevels(k).length) { b = k; break; } }
    this.branch = b;
  }

  create() {
    fadeIn(this);
    this.testHooks = {};
    new Backdrop(this, { zone: 1 });
    topBar(this, { back: () => this.goBack(), title: t('pass.title') });
    const D = DEPTH.hud;
    // 챕터 탭 5개 (잠긴 챕터는 자물쇠)
    this.tabs = [];
    for (let b = 1; b <= CONFIG.branchCount; b++) {
      const x = L.tabs.x + (b - 1) * L.tabs.step + L.tabs.w / 2;
      const btn = button(this, { x, y: L.tabs.y + L.tabs.h / 2, w: L.tabs.w, h: L.tabs.h, variant: b === this.branch ? 'secondary' : 'neutral', size: 18, label: t('pass.tab', { b }), maxW: 80, onClick: () => { if (b !== this.branch) go(this, 'Pass', { from: this.from, branch: b }); }, depth: D });
      if (!isBranchUnlocked(b)) image(this, 'lock', 26, x + L.tabs.w / 2 - 8, L.tabs.y + 4).setDepth(D + 1);
      this.tabs.push(btn);
    }
    const b = this.branch;
    this.unlocked = isBranchUnlocked(b);
    // 진행 상자
    const [px, py, pw, ph] = L.progress;
    panel(this, px, py, pw, ph).setDepth(DEPTH.objects);
    const stars = branchStars(b);
    const lv = passLevel(b);
    text(this, 270, py + 30, t('pass.progress', { n: stars, lv }), { size: 28, color: P.text, maxW: 440 }).setDepth(D);
    const bar = progressBar(this, 270, py + 66, 420).setDepth(D);
    bar.setValue(stars / (CONFIG.passLevelCount * CONFIG.passStarsPerLevelCount));
    const next = passStarsToNext(b);
    text(this, 270, py + 100, lv >= CONFIG.passLevelCount ? t('pass.allClaimed') : t('pass.nextLevel', { n: next }), { size: 18, color: P.textDim, maxW: 440 }).setDepth(D);
    // 모두 받기
    const claimable = claimableLevels(b);
    this.claimAllBtn = button(this, { x: L.claimAll[0] + L.claimAll[2] / 2, y: L.claimAll[1] + L.claimAll[3] / 2, w: L.claimAll[2], h: L.claimAll[3], variant: 'primary', size: 24, label: t('pass.claimAll'), icon: 'reward_closed', iconSize: 36, onClick: () => this.claimAll(), depth: D });
    this.claimAllBtn.setVisible(claimable.length >= 2);
    // 정원으로
    const [gx, gy, gw, gh] = L.toGarden;
    button(this, { x: gx + gw / 2, y: gy + gh / 2, w: gw, h: gh, variant: 'secondary', size: 24, label: t('pass.toGarden'), icon: 'b1_gardener_hut_day', iconSize: 44, onClick: () => go(this, 'Garden', {}), depth: D });
    // 줄 목록: 필요한 이미지를 불러온 뒤 만든다
    const keys = [];
    for (let l = 1; l <= CONFIG.passLevelCount; l++) {
      const r = passReward(b, l);
      if (r && r.type === 'item') keys.push(...itemImages(r.id));
      if (r && r.type === 'friend') keys.push(r.id);
    }
    if (!this.unlocked) text(this, 270, 346, t('pass.trackLocked', { b }), { size: 22, color: P.dangerText, maxW: 460 }).setDepth(D);
    const loading = text(this, 270, 600, t('common.loading'), { size: 24, color: P.textDim }).setDepth(D);
    ensureImages(this, keys, () => { loading.destroy(); if (sceneAlive(this)) this.buildRows(); });
    this.input.keyboard.on('keydown-ESC', () => this.goBack());
  }

  goBack() {
    if (this.from === 'StageSelect' || this.from === 'Result') go(this, 'StageSelect', { branch: this.fromBranch || 1 });
    else go(this, 'Menu');
  }

  buildRows() {
    const b = this.branch;
    const r = L.rows;
    this.view = new ClipView(this, { x: 0, y: r.y - 6, w: 540, h: r.visible * r.step + 2, axis: 'y' });
    this.layer = this.add.container(0, 0);
    this.view.add(this.layer);
    this.rowObjs = [];
    this.rowTex = [];
    this.events.once('shutdown', () => this.dropRowTextures());
    const lv = passLevel(b);
    for (let l = 1; l <= CONFIG.passLevelCount; l++) this.layer.add(this.makeRow(l, r.x, r.y + (l - 1) * r.step, lv));
    this.view.setContentSize(15 * r.step + 12);
    this.view.onScroll = () => this.cullRows();
    // 처음에는 받을 수 있는 첫 보상 근처가 보이게
    const claimable = claimableLevels(b);
    const focus = claimable.length ? claimable[0] : Math.min(CONFIG.passLevelCount, lv + 1);
    this.view.setScroll(Math.max(0, (focus - 2) * r.step));
    this.view.enableDrag(r.step);
    this.cullRows();
  }

  // 보이는 영역 밖의 줄은 그리지 않는다 (줄 하나가 그리기 호출 10여 개라 15줄을 다 그리면 드래그가 끊겼다)
  cullRows() {
    if (!this.view || !this.rowObjs) return;
    const r = L.rows;
    const top = this.view.rect.y + this.view.scroll - r.step * 0.5;
    const bottom = this.view.rect.y + this.view.scroll + this.view.rect.h + r.step * 0.5;
    for (let l = 1; l <= CONFIG.passLevelCount; l++) {
      const c = this.rowObjs[l];
      if (!c) continue;
      const y = r.y + (l - 1) * r.step;
      c.setVisible(y + r.h > top && y < bottom);
    }
  }

  // 받은 뒤 줄을 다시 만든다 (스크롤 위치 유지)
  rebuildRows() {
    if (!this.layer) return;
    const keep = this.view.scroll;
    const r = L.rows;
    const lv = passLevel(this.branch);
    for (let l = 1; l <= CONFIG.passLevelCount; l++) {
      const old = this.rowObjs[l];
      if (old && old.sig === this.rowSig(l, lv)) continue;
      if (old) {
        if (old.box) this.tweens.killTweensOf(old.box);
        if (old.btn) old.btn.setPulse(false);
        this.layer.remove(old, true);
      }
      this.layer.add(this.makeRow(l, r.x, r.y + (l - 1) * r.step, lv));
    }
    this.view.setScroll(keep);
    this.cullRows();
    this.claimAllBtn.setVisible(claimableLevels(this.branch).length >= 2);
    this.claiming = false;
  }

  // 줄의 모양을 정하는 상태 (도달 여부, 받음 여부)
  rowSig(l, lv) { return (l <= lv && this.unlocked ? '1' : '0') + (save.isClaimed(this.branch, l) ? '1' : '0'); }

  dropRowTextures() {
    if (!this.rowTex) return;
    for (const k of this.rowTex) { if (this.textures.exists(k)) this.textures.remove(k); }
    this.rowTex = [];
  }

  // 줄의 바탕(패널, 단계 원, 이름, 받았음/잠김 표시)을 그림 한 장으로 굽는다: 줄 하나가 그리기 호출 14개 안팎이라 스크롤이 끊겼다.
  // 굽지 못하면(오류) 원래 오브젝트를 그대로 쓴다. 상자/버튼 모션은 굽지 않고 따로 둔다.
  bakeRow(cont, l) {
    const pad = 24;
    const S = 2;
    const w = L.rows.w;
    const h = L.rows.h;
    const key = `pass_row_${l}`;
    try {
      if (this.textures.exists(key)) this.textures.remove(key);
      const dt = this.textures.addDynamicTexture(key, (w + pad * 2) * S, (h + pad * 2) * S);
      const ox = cont.x; const oy = cont.y;
      cont.setPosition(pad * S, pad * S).setScale(S);
      dt.capture(cont, { transform: 'local' });
      dt.render();
      cont.setPosition(ox, oy).setScale(1);
      this.rowTex.push(key);
      cont.removeAll(true);
      const im = this.add.image(0, 0, key).setOrigin(0, 0).setScale(1 / S);
      im.setPosition(-pad, -pad);
      cont.add(im);
    } catch (e) { cont.setPosition(0, 0).setScale(1); /* 굽기에 실패하면 줄 오브젝트를 그대로 둔다 */ }
  }

  rewardInfo(rw) {
    if (!rw) return { name: '', art: null };
    if (rw.type === 'coins') return { name: t('reward.coins', { n: rw.n }), art: 'coin' };
    if (rw.type === 'hints') return { name: t('reward.hints', { n: rw.n }), art: 'hint_bulb' };
    if (rw.type === 'plot') return { name: t('reward.plot'), art: 'plot' };
    if (rw.type === 'friend') return { name: t(`item.${rw.id}`), art: rw.id };
    if (rw.type === 'skin') return { name: t(`skin.${rw.id}`), art: rw.id };
    return { name: t(ITEMS[rw.id].nameKey), art: itemTexture(rw.id), item: ITEMS[rw.id] };
  }

  artImage(info, size) {
    if (info.art === 'plot') {
      const c = this.add.container(0, 0);
      const g = this.add.graphics();
      g.fillStyle(0xCFEDBC, 1).fillPoints([{ x: 0, y: -size / 4 }, { x: size / 2, y: 0 }, { x: 0, y: size / 4 }, { x: -size / 2, y: 0 }], true);
      g.lineStyle(3, 0x5E9A63, 1).strokePoints([{ x: 0, y: -size / 4 }, { x: size / 2, y: 0 }, { x: 0, y: size / 4 }, { x: -size / 2, y: 0 }], true);
      c.add(g); c.add(text(this, 0, -2, '+2', { size: 18, color: P.ink }));
      return c;
    }
    let key = info.art;
    if (info.item && this.textures.exists(key)) key = bakeGardenTexture(this, key, info.item.kind === 'ground' ? 'floor' : 'day');
    const im = image(this, key, size);
    return im;
  }

  // 줄 = 바뀌지 않는 바탕(base, 그림 한 장으로 구워 둔다) + 받을 수 있는 줄의 움직이는 부분(상자, 보상 그림, 받기 버튼)
  makeRow(l, x, y, lv) {
    const b = this.branch;
    const cont = this.add.container(x, y);
    const base = this.add.container(0, 0);
    cont.add(base);
    const reached = l <= lv && this.unlocked;
    const claimed = save.isClaimed(b, l);
    const canClaim = reached && !claimed;
    const rw = passReward(b, l);
    const info = this.rewardInfo(rw);
    const h = L.rows.h;
    base.add(panel(this, 0, 0, L.rows.w, h, { flat: true }));
    // 단계 원: 도달하면 금빛
    const disc = this.add.graphics();
    disc.fillStyle(reached ? 0xFFDB5C : 0xE6EBF0, 1).fillCircle(34, h / 2, 22);
    disc.lineStyle(3, reached ? 0xE2B53A : 0xFFFFFF, 1).strokeCircle(34, h / 2, 22);
    base.add(disc);
    base.add(text(this, 34, h / 2 - 2, String(l), { size: 22, color: P.ink }));
    base.add(text(this, 150, h / 2 - 2, info.name, { size: 20, color: P.ink, origin: 0, maxW: 190, minSize: 14 }));
    // 보상 그림
    const art = this.artImage(info, 54);
    if (canClaim) {
      const box = image(this, 'reward_closed', 70, 100, h / 2 + 2);
      cont.add(box);
      art.setPosition(100, h / 2 + 4).setScale(art.scaleX * 0.62);
      cont.add(art);
      this.tweens.add({ targets: box, scale: { from: box.scaleX, to: box.scaleX * 1.06 }, duration: M.passBoxIdle, yoyo: true, repeat: -1, ease: THEME.easing.passBoxIdle });
      cont.box = box; cont.art = art;
    } else {
      art.setPosition(100, h / 2 + 2);
      base.add(art);
      if (!reached) art.setAlpha(0.55);
      cont.art = art;
    }
    // 오른쪽: 받기 | 받았어요 | 잠김
    if (canClaim) {
      const btn = button(this, { x: 408, y: h / 2, w: 116, h: 56, variant: 'primary', size: 18, label: t('pass.claim'), onClick: () => this.claim(l, cont), sound: () => {} });
      btn.setPulse(true);
      cont.add(btn);
      cont.btn = btn;
    } else if (claimed) {
      base.add(image(this, 'ui-blue-icon-checkmark@pastel', 30, 372, h / 2));
      base.add(text(this, 392, h / 2 - 2, t('pass.claimed'), { size: 19, color: P.text, origin: 0 }));
    } else {
      base.add(image(this, 'star_empty', 22, 354, h / 2));
      base.add(text(this, 370, h / 2 - 2, t('pass.locked', { n: passStarsFor(l) }), { size: 16, color: P.textDim, origin: 0, maxW: 106, minSize: 11 }));
    }
    this.bakeRow(base, l);
    cont.sig = this.rowSig(l, lv);
    this.rowObjs[l] = cont;
    return cont;
  }

  // F16: 상자가 떨리고 열리며 보상 그림이 커졌다가 보관함/지갑으로 날아간다
  claim(l, cont, quiet) {
    if (this.view && this.view.dragged) return;
    if (this.claiming && !quiet) return;
    const b = this.branch;
    if (this.registry.get('gardenPlotSeen') === undefined) this.registry.set('gardenPlotSeen', save.getGarden().plot);
    const res = wallet.grantReward(b, l);
    if (!res) return;
    if (!quiet) this.claiming = true;
    const rw = res.reward;
    sfx.passClaim();
    if (cont.btn) { cont.btn.setPulse(false); cont.btn.setDisabled(true); }
    const box = cont.box;
    if (box) {
      this.tweens.add({ targets: box, x: box.x + 4, duration: M.passBoxShake / 4, yoyo: true, repeat: 1, ease: THEME.easing.passBoxShake, onComplete: () => { box.setTexture('reward_open'); } });
    }
    const target = rw.type === 'coins' || rw.type === 'hints' ? { x: 455, y: 52 } : { x: 270, y: 930 };
    const fly = this.artImage(this.rewardInfo(rw), 54).setDepth(DEPTH.popup + 3);
    const sx = cont.x + 100;
    const sy = cont.y + L.rows.h / 2 - (this.view ? this.view.scroll : 0);
    fly.setPosition(sx, sy);
    this.time.delayedCall(M.passBoxShake, () => {
      this.tweens.add({ targets: fly, scale: fly.scaleX * 1.25, duration: 160, yoyo: true });
      this.tweens.add({ targets: fly, x: target.x, y: target.y, alpha: 0.2, duration: M.passRewardFly, delay: 160, ease: THEME.easing.passRewardFly, onComplete: () => { fly.destroy(); this.afterClaim(l, rw, res, quiet); } });
    });
  }

  afterClaim(l, rw, res, quiet) {
    this.claiming = false;
    if (rw.type === 'plot') { sfx.plotExpand(); toast(this, t('garden.plotGrew'), { kind: 'normal', y: 160 }); }
    if (res.overflowCoins) toast(this, t('pass.grantedHintsOverflow', { n: res.overflowCoins }), { kind: 'info', y: 220, size: 20 });
    if (!quiet) this.rebuildRows();
  }

  claimAll() {
    const levels = claimableLevels(this.branch);
    if (!levels.length || this.claiming) return;
    this.claiming = true;
    let n = 0;
    levels.forEach((l, i) => {
      this.time.delayedCall(i * 220, () => {
        const cont = this.rowObjs[l];
        if (cont) this.claim(l, cont, true);
        else wallet.grantReward(this.branch, l);
        n += 1;
        if (n === levels.length) this.time.delayedCall(M.passBoxShake + 160 + M.passRewardFly + 120, () => { this.claiming = false; this.rebuildRows(); });
      });
    });
  }
}
