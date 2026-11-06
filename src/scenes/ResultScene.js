// S4 result: 별 연출, 퍼펙트, 이동, 최고 기록/NEW, 목표, 힌트 사용, 코인, 패스 진행, 해금 알림, 다음/다시/공유/목록/상점/패스, 광고 영역(R15, R23, R24, R35, F6~F9, F19, F20, F33, F34).
import { THEME } from '../theme.js';
import { CONFIG } from '../config.js';
import { t } from '../i18n/index.js';
import { Backdrop } from '../ui/bg.js';
import { button, panel, text, image, chip, ribbon, toast, badge, progressBar, go, fadeIn, DEPTH, nudge, glowBlob } from '../ui/kit.js';
import { branchOf, localOf, labelOf, stageById } from '../stages.js';
import { claimableCount, nextStageId, passStarsToNext, branchStars, passLevel, allStagesCleared } from '../progress.js';
import { sfx } from '../audio.js';
import { onRoundEnd } from '../ads.js';
import { hasSeen, markSeen } from '../save.js';

const M = THEME.motionMs;
const E = THEME.easing;
const P = THEME.palette;

export default class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  init(data) { this.data_ = data || {}; }

  create() {
    fadeIn(this);
    onRoundEnd(this.game);
    this.testHooks = {};
    const d = this.data_;
    const id = d.stage || 1;
    const b = branchOf(id);
    const n = localOf(id);
    const goal = stageById(id).goal;
    const moves = d.moves;
    const stars = d.stars;
    const rec = d.rec || {};
    const perfect = stars === 3;
    this.timers = [];
    this.sparkEm = null;
    new Backdrop(this, { zone: b, clouds: [[24, 640, 110], [400, 660, 96]] });
    const D = DEPTH.objects;
    panel(this, 30, 36, 480, 648).setDepth(D);
    const top = DEPTH.hud;
    text(this, 270, 84, t('result.cleared'), { size: 34, color: P.text, maxW: 440 }).setDepth(top);

    // 별 3개: 300ms 간격으로 커지며 나타난다 (F7)
    const spots = [[168, 176, 96], [278, 160, 112], [384, 176, 96]];
    this.starImgs = spots.map(([x, y, s], i) => {
      const im = image(this, i < stars ? 'star_full' : 'star_empty', s, x, y).setDepth(top).setScale(0);
      im.full = s / Math.max(im.width, im.height);
      return im;
    });
    this.starImgs.forEach((im, i) => {
      this.at(i * M.starStep, () => {
        im.setScale(0);
        this.tweens.add({ targets: im, scale: { from: 0, to: im.full * 1.3 }, duration: M.starStep * 0.6, ease: E.starStep, onComplete: () => this.tweens.add({ targets: im, scale: im.full, duration: M.starStep * 0.4 }) });
        if (i < stars) { sfx.star(i); this.sparkle(im.x, im.y); } else { sfx.starLost(); }
      });
    });

    // 퍼펙트 배지 (F33)
    const my = perfect ? 306 : 252;
    if (perfect) {
      const medal = image(this, 'badge_perfect', 76, 198, 258).setDepth(top + 1).setScale(0);
      medal.full = 76 / Math.max(medal.width, medal.height); // 이미지는 크기에 맞춘 배율이 기본이라 1 로 돌려놓으면 원본 크기(128px)로 커져 별을 덮는다
      const rb = ribbon(this, 290, 258, t('result.perfect'), { kind: 'gold', size: 26, h: 52, padX: 50 }).setDepth(top).setScale(0);
      this.at(M.resultNewBestAt, () => {
        sfx.perfect();
        const pop = (o, full) => this.tweens.add({ targets: o, scale: { from: 0, to: full * 1.3 }, duration: M.perfectBadge * 0.7, ease: E.perfectBadge, onComplete: () => this.tweens.add({ targets: o, scale: full, duration: M.perfectBadge * 0.3 }) });
        pop(medal, medal.full);
        pop(rb, 1);
        rb.addAt(glowBlob(this, rb.w, rb.h, 'gold'), 0); // 퍼펙트 글로우: 필터 대신 이미지 (필터는 매 프레임 렌더 타깃을 거쳐 이 화면이 렉걸렸다)
      });
    }
    this.movesText = text(this, 270, my + 20, t('result.moves', { k: moves }), { size: 44, color: P.text }).setDepth(top);
    if (rec.newBest) {
      const nb = chip(this, 400, my + 8, t('result.newBest'), { kind: 'rose', size: 20 }).setDepth(top + 1).setAngle(8).setScale(0);
      this.at(M.resultNewBestAt, () => { sfx.newBest(); this.tweens.add({ targets: nb, scale: 1, duration: M.badgePop * 1.4, ease: E.badgePop }); });
    }
    // 최고 기록 / 목표 칩
    const row1 = perfect ? 372 : 332;
    const best = chip(this, 0, row1, t('result.best', { k: rec.best || moves }), { kind: 'white', size: 20 }).setDepth(top);
    const gl = chip(this, 0, row1, t('result.goal', { k: goal }), { kind: perfect ? 'gold' : 'white', size: 20, icon: 'star_full', iconSize: 24 }).setDepth(top);
    const gap = 10; const total = best.w + gap + gl.w;
    best.x = 270 - total / 2 + best.w / 2; gl.x = 270 - total / 2 + best.w + gap + gl.w / 2;
    if (!perfect) text(this, 270, row1 + 44, t('result.goalHint', { k: goal }), { size: 18, color: P.textDim, maxW: 440 }).setDepth(top);
    // 힌트 사용 / 코인
    const row2 = perfect ? 428 : 426;
    const hintChip = d.hintsUsed > 0
      ? chip(this, 150, row2, t('result.hintUsed', { n: d.hintsUsed }), { kind: 'white', size: 20, icon: 'hint_bulb', iconSize: 24 })
      : chip(this, 150, row2, t('result.noHint'), { kind: 'mint', size: 20, icon: 'hint_bulb', iconSize: 24 });
    hintChip.setDepth(top);
    this.coinRow = null;
    const earned = d.coins ? d.coins.earned : 0;
    if (earned > 0) {
      const coin = image(this, 'coin', 40, 330, row2).setDepth(top);
      const ct = text(this, 354, row2 - 2, t('result.coinsEarned', { n: earned }), { size: 30, color: '#FFFFFF', stroke: '#C98F00', strokeW: 7, shadowY: 4, shadowColor: '#C98F00', origin: 0 }).setDepth(top);
      coin.setAlpha(0); ct.setAlpha(0);
      this.at(M.resultCoinAt, () => { sfx.coinGain(); this.tweens.add({ targets: [coin, ct], alpha: 1, duration: 200 }); this.tweens.add({ targets: ct, scale: { from: 0.6, to: 1 }, duration: M.coinPop, ease: E.coinPop }); });
    }

    // 패스 진행 (R35, F34)
    const before = d.before || { branchStars: 0, passLevel: 0 };
    const after = d.after || before;
    image(this, 'reward_closed', 40, 80, 504).setDepth(top);
    text(this, 106, 502, t('pass.tab', { b }), { size: 22, color: P.ink, origin: 0, originY: 0.5 }).setDepth(top);
    const bar = progressBar(this, 270, 546, 420).setDepth(top);
    const per = CONFIG.passStarsPerLevelCount;
    const ratioOf = (s) => (passLevel(b) >= CONFIG.passLevelCount && s >= per * CONFIG.passLevelCount ? 1 : (s % per) / per);
    const leveled = after.passLevel > before.passLevel;
    bar.setValue(ratioOf(before.branchStars));
    const toGoal = after.passLevel >= CONFIG.passLevelCount ? 0 : passStarsToNext(b);
    const nextText = text(this, 270, 584, toGoal > 0 ? t('result.passNext', { n: toGoal }) : t('pass.claimed'), { size: 18, color: P.textDim, maxW: 420 }).setDepth(top);
    this.at(M.resultCoinAt, () => {
      if (leveled) {
        bar.fillTo(1, M.passBarFill);
        this.time.delayedCall(M.passBarFill, () => {
          bar.setGold(true); sfx.passLevel();
          const rb = ribbon(this, 390, 504, t('result.passLevel', { lv: after.passLevel }), { kind: 'gold', size: 24, h: 48, padX: 40 }).setDepth(top + 2).setScale(0);
          this.tweens.add({ targets: rb, scale: { from: 0, to: 1.2 }, duration: M.passLevelPop, ease: E.passLevelPop, onComplete: () => this.tweens.add({ targets: rb, scale: 1, duration: 100 }) });
          bar.setValue(1);
        });
      } else bar.fillTo(ratioOf(after.branchStars), M.passBarFill);
    });
    // 해금 알림
    const unlockStage = !before.nextStage && after.nextStage;
    const unlockBranch = !before.nextBranch && after.nextBranch;
    if (unlockBranch) {
      const r = ribbon(this, 270, 624, t('result.branchUnlocked', { name: t(`branch.name${b + 1}`) }), { kind: 'pink', size: 21, h: 50, maxW: 440 }).setDepth(top + 2).setAlpha(0);
      this.at(M.resultUnlockAt, () => { sfx.unlock(); this.tweens.add({ targets: r, alpha: 1, duration: 250 }); });
    } else if (unlockStage) {
      const r = ribbon(this, 270, 624, t('result.unlock'), { kind: 'sky', size: 22, h: 50, maxW: 440 }).setDepth(top + 2).setAlpha(0);
      this.at(M.resultUnlockAt, () => { sfx.unlock(); this.tweens.add({ targets: r, alpha: 1, duration: 250 }); });
    }

    // 버튼 (theme.layout.result)
    const nxt = d.forced ? null : nextStageId(id);
    // 모든 스테이지를 처음 다 클리어한 판: 다음 버튼이 엔딩으로 간다 (한 번만)
    const endingDue = !d.forced && allStagesCleared() && !hasSeen('ending');
    this.nextBtn = button(this, {
      x: 270, y: 746, w: 360, h: 92, variant: 'primary', size: 30, label: endingDue ? t('result.ending') : t('result.next'), glyph: 'ui-extra-icon-play-dark', iconSize: 32, disabled: !nxt && !endingDue,
      onClick: () => { if (endingDue) { markSeen('ending'); go(this, 'Ending'); } else go(this, 'Play', { stage: nxt }); },
      onDisabledClick: () => toast(this, id >= CONFIG.stageCount ? t('result.lastStage') : t('result.nextLocked'), { kind: 'info', y: 660 }),
      depth: top
    });
    this.retryBtn = button(this, { x: 148, y: 838, w: 236, h: 72, variant: 'secondary', size: 20, label: t('result.retry'), glyph: 'ui-extra-icon-repeat-dark', iconSize: 28, onClick: () => go(this, 'Play', { stage: id }), depth: top });
    this.testHooks.retryButton = this.retryBtn;
    this.testHooks.nextButton = this.nextBtn;
    button(this, { x: 392, y: 838, w: 236, h: 72, variant: 'secondary', size: 20, label: t('result.share'), code: 'share', iconSize: 28, onClick: () => this.share(b, n, stars, moves), depth: top });
    button(this, { x: 106, y: 915, w: 152, h: 62, variant: 'neutral', size: 18, label: t('result.toStages'), onClick: () => go(this, 'StageSelect', { branch: b }), depth: top });
    button(this, { x: 270, y: 915, w: 152, h: 62, variant: 'neutral', size: 18, label: t('result.toShop'), icon: 'coin', iconSize: 26, onClick: () => go(this, 'Shop', { from: 'Result', branch: b }), depth: top });
    const passBtn = button(this, { x: 434, y: 915, w: 152, h: 62, variant: leveled ? 'secondary' : 'neutral', size: 18, label: t('result.toPass'), icon: 'reward_closed', iconSize: 30, onClick: () => go(this, 'Pass', { from: 'Result', branch: b }), depth: top });
    const claim = claimableCount();
    if (claim > 0) { const bd = badge(this, 490, 903, claim, 36).setDepth(top + 1); bd.setPulse(true); }
    if (leveled && !hasSeen('passBlink')) { markSeen('passBlink'); passBtn.setPulse(true); this.time.delayedCall(M.pulse * 2, () => passBtn.setPulse(false)); }
    this.input.keyboard.on('keydown-ENTER', () => this.nextBtn.trigger());
    this.input.keyboard.on('keydown-ESC', () => go(this, 'Menu'));
    // 탭하면 연출을 건너뛴다
    this.input.once('pointerdown', () => { /* 연출은 짧아 별도 건너뛰기는 두지 않는다 */ });
  }

  at(ms, fn) { const ev = this.time.delayedCall(ms, fn); this.timers.push(ev); return ev; }

  sparkle(x, y) {
    const em = this.add.particles(x, y, 'p_spark', { emitting: false, lifespan: 500, speed: { min: 40, max: 130 }, scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 }, blendMode: 'ADD' }).setDepth(DEPTH.hud + 2);
    em.explode(8);
    this.time.delayedCall(700, () => em.destroy());
  }

  share(b, n, stars, moves) {
    const str = t('share.text', { b, n, s: stars, k: moves });
    const done = () => { sfx.soft(); toast(this, t('result.copied'), { kind: 'info', y: 800 }); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(str).then(done, done);
      else done();
    } catch (e) { done(); }
  }
}
